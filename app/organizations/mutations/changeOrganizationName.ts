import { resolver } from "@blitzjs/rpc";
import db from "db";
import { Name } from "../validations";

export default resolver.pipe(
  resolver.zod(Name),
  resolver.authorize(["OWNER"]),
  async ({ id, name }, ctx) => {
    await db.membership.findFirstOrThrow({
      where: { organizationId: id, userId: ctx.session.userId },
      include: {
        organization: true,
      },
    });

    await db.organization.update({
      where: { id },
      data: { name },
    });

    return true;
  }
);
