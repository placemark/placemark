import { resolver } from "@blitzjs/rpc";
import { updateSession } from "app/core/updateSession";
import { z } from "zod";
import db from "db";
import { logger } from "integrations/log";
import { campaignMonitorUnubscribe } from "integrations/campaignmonitor";
import { AuthorizationError } from "blitz";
import { capture } from "integrations/posthog";
import { deletedAccountMailer } from "mailers/deletedAccountMailer";

const DeleteOrganization = z.object({
  session_id: z.optional(z.string()),
  force: z.optional(z.boolean()),
});

export default resolver.pipe(
  resolver.zod(DeleteOrganization),
  resolver.authorize(["OWNER", "SUPERADMIN"]),
  async ({ force }, ctx) => {
    const myOrgCount = await db.membership.count({
      where: {
        userId: ctx.session.userId,
      },
    });

    if (myOrgCount === 1 && !force) {
      throw new AuthorizationError(
        "This is your last team. You need to be on at least one team."
      );
    }

    const orgId = ctx.session.orgId;

    if (!orgId) return;

    // Delete all memberships of this organization.
    await db.membership.deleteMany({
      where: {
        organizationId: orgId,
      },
    });

    // Delete the organization itself.
    await db.organization.delete({
      where: {
        id: orgId,
      },
    });

    // If the organization we just deleted is also
    // the organization you’re logged into, update
    // the user's session.
    if (orgId === ctx.session.orgId) {
      // Log into the next team available
      const membership = await db.membership.findFirst({
        where: {
          userId: ctx.session.userId,
        },
        include: {
          user: true,
        },
      });

      if (membership) {
        logger.info(
          `deleted org, updating session to  ${membership.organizationId}`
        );
        await updateSession(membership, ctx);
      } else if (force) {
        // We force-deleted our last organization: this means we should delete
        // the user too.
        const user = await db.user.delete({
          where: {
            id: ctx.session.userId,
          },
        });
        await ctx.session.$revoke();
        await campaignMonitorUnubscribe(user.email);
        await deletedAccountMailer({ to: user.email }).send();
        capture(ctx, {
          event: "cancel",
        });
      }
    }

    capture(ctx, {
      event: "organization-delete",
    });

    return true;
  }
);
