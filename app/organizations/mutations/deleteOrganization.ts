import { resolver } from "@blitzjs/rpc";
import { updateSession } from "app/core/updateSession";
import stripe from "integrations/stripe";
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

async function getOrgIdFromSessionId(
  session_id: string
): Promise<number | null> {
  const session = await stripe.checkout.sessions.retrieve(session_id);
  const customerId = session.customer as string | null;
  if (!customerId) return null;

  const organization = await db.organization.findFirst({
    where: {
      stripeCustomerId: customerId,
    },
  });

  return organization?.id ?? null;
}

export default resolver.pipe(
  resolver.zod(DeleteOrganization),
  resolver.authorize(["OWNER", "SUPERADMIN"]),
  async ({ session_id, force }, ctx) => {
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

    const orgId = await (session_id
      ? getOrgIdFromSessionId(session_id)
      : ctx.session.orgId);

    if (!orgId) return;

    // Delete all memberships of this organization.
    await db.membership.deleteMany({
      where: {
        organizationId: orgId,
      },
    });

    // Delete the organization itself.
    const org = await db.organization.delete({
      where: {
        id: orgId,
      },
    });

    logger.info(`Deleting ${org.stripeCustomerId} stripe customer`);
    // Delete the organization's Stripe customer
    await stripe.customers.del(org.stripeCustomerId);

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
