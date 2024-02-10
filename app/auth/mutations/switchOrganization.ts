import { resolver } from "@blitzjs/rpc";
import db from "db";
import { SwitchOrganization } from "../validations";
import { updateSession } from "app/core/updateSession";

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

    await updateSession(membership, ctx);
    return true;
  }
);
