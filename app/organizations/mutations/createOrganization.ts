import { resolver } from "@blitzjs/rpc";
import db from "db";
import { CreateOrganization } from "../validations";

export default resolver.pipe(
  resolver.zod(CreateOrganization),
  resolver.authorize(),
  async ({ name }, ctx) => {
    const user = await db.user.findFirstOrThrow({
      where: { id: ctx.session.userId },
    });

    const organization = await db.organization.create({
      data: {
        name,
        membership: {
          create: {
            role: "OWNER",
            userId: user.id,
          },
        },
      },
      include: {
        membership: true,
      },
    });

    await ctx.session.$setPublicData({
      orgId: organization.id,
      roles: [user.role, "OWNER"],
    });

    return;
  }
);
