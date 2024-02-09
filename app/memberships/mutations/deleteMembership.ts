import { setPublicDataForUser } from "@blitzjs/auth";
import { resolver } from "@blitzjs/rpc";
import { AuthorizationError, Ctx } from "blitz";
import type { User } from "db";
import db from "db";
import { DeleteMembership } from "app/memberships/validations";
import { capture } from "integrations/posthog";

/*
 * - Immediately logs out the removed member from the organization.
 *   If they have other organization memberships, they're reset to their
 *   first membership. Otherwise, they're logged out of all organizations
 *   and will see a form to create an organization when they log in next.
 */
async function logUserOutFromOrganization(user: User) {
  const [firstMembership] = await db.membership.findMany({
    where: {
      userId: user.id,
    },
  });

  if (firstMembership) {
    await setPublicDataForUser(user.id, {
      orgId: firstMembership.organizationId,
      roles: [user.role, firstMembership.role],
    });
    return;
  }

  await setPublicDataForUser(user.id, {
    orgId: undefined,
    roles: [user.role],
  });
}

/**
 * Delete a member from an organization.
 *
 * - Deletes the membership.
 * - Logs out the removed member from the organization.
 * - Adjusts pricing of the organization for the new # of members
 */
export default resolver.pipe(
  resolver.zod(DeleteMembership),
  resolver.authorize(),
  async ({ id }, ctx: Ctx) => {
    const membership = await db.membership.findFirstOrThrow({
      where: {
        id,
      },
      include: { user: true },
    });

    const { user } = membership;
    if (!user) {
      throw new AuthorizationError(
        "This membership is an invitation: it is not attached to a user"
      );
    }

    const otherAdmin = await db.membership.findFirst({
      where: {
        id: { not: id },
        organizationId: membership.organizationId,
        role: { not: "USER" },
      },
      include: { user: true },
    });

    if (!otherAdmin?.user) {
      throw new AuthorizationError(
        "You are the last administrator on this team. Appoint someone else before removing yourself."
      );
    }

    // If this member is not removing themselves
    // from the organization, they MUST be an owner or superadmin
    if (membership.userId !== ctx.session.userId) {
      ctx.session.$authorize(["OWNER", "SUPERADMIN"]);
    }

    // Delete the membership
    await db.membership.deleteMany({
      where: { id: id, organizationId: ctx.session.orgId },
    });

    // Log out the user from any current sessions in this
    // team.
    await logUserOutFromOrganization(user);

    capture(ctx, {
      event: "membership-delete",
    });

    return true;
  }
);
