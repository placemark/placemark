import { resolver } from "@blitzjs/rpc";
import db from "db";
import { UpdateUserOptions } from "../validations";
import { getCurrentUserInternal } from "app/users/queries/getCurrentUser";
import { capture } from "integrations/posthog";

export default resolver.pipe(
  resolver.zod(UpdateUserOptions),
  resolver.authorize(),
  async function updateUserOptions(arg, ctx) {
    await db.user.update({
      where: { id: ctx.session.userId },
      data: arg,
    });

    capture(ctx, {
      event: "user-update-settings",
    });

    return getCurrentUserInternal(ctx);
  }
);
