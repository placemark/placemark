import { setPublicDataForUser } from "@blitzjs/auth";
import { AuthenticatedCtx } from "blitz";
import type { User, Membership } from "db";

export async function updateSession(
  membership: Membership & {
    user: User | null;
  },
  ctx: AuthenticatedCtx
) {
  const { user } = membership;

  if (!user) {
    throw new Error("Unexpectedly found a membership without an attached user");
  }

  await ctx.session.$setPublicData({
    orgId: membership.organizationId,
    roles: [user.role, membership.role],
  });
  return await setPublicDataForUser(ctx.session.userId, {
    orgId: membership.organizationId,
    roles: [user.role, membership.role],
  });
}
