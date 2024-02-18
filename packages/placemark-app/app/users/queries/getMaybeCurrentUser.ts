import { Ctx, AuthenticatedCtx } from "blitz";
import { getCurrentUserInternal } from "app/users/queries/getCurrentUser";

export default async function getMaybeCurrentUser(_ = null, ctx: Ctx) {
  try {
    return await getCurrentUserInternal(ctx as AuthenticatedCtx);
  } catch (e) {
    return null;
  }
}

export type CurrentUser = Awaited<ReturnType<typeof getMaybeCurrentUser>>;
