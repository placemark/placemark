import { resolver } from "@blitzjs/rpc";
import db from "db";
import { CancelInvite } from "app/organizations/validations";
import { NotFoundError } from "blitz";
import { capture } from "integrations/posthog";

export default resolver.pipe(
  resolver.zod(CancelInvite),
  resolver.authorize(),
  async ({ id }, ctx) => {
    // Any member of an organization
    // can cancel an invitation.
    const { count } = await db.membership.deleteMany({
      where: {
        id,
        // Ensure that this membership is still in the 'invitation'
        // state.
        userId: null,
        organizationId: ctx.session.orgId,
      },
    });

    capture(ctx, {
      event: "invitation-cancel",
    });

    if (count !== 1) throw new NotFoundError();

    return true;
  }
);
