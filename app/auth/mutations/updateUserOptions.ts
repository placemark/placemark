import { resolver } from "@blitzjs/rpc";
import db from "db";
import { UpdateUserOptions } from "../validations";
import { getCurrentUserInternal } from "app/users/queries/getCurrentUser";

export default resolver.pipe(
  resolver.zod(UpdateUserOptions),
  resolver.authorize(),
  async function updateUserOptions(arg, ctx) {
    await db.user.update({
      where: { id: ctx.session.userId },
      data: arg,
    });

    return getCurrentUserInternal(ctx);
  }
);
