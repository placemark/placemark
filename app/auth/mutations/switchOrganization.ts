import { resolver } from "@blitzjs/rpc";
import db from "db";
import { SwitchOrganization } from "../validations";
import { updateSession } from "app/core/updateSession";
import { capture } from "integrations/posthog";

export default resolver.pipe(
  resolver.zod(SwitchOrganization),
  resolver.authorize(),
  async ({ id }, ctx) => {
    const membership = await db.membership.findFirstOrThrow({
      where: {
        userId: ctx.session.userId,
        organizationId: id,
      },
      include: {
        user: true,
      },
    });

    capture(ctx, {
      event: "organization-switch",
    });

    await updateSession(membership, ctx);
    return true;
  }
);
