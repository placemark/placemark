import { Ctx } from "blitz";
import { capture } from "integrations/posthog";

export default async function logout(_: any, ctx: Ctx) {
  capture(ctx, {
    event: "logout",
  });

  return await ctx.session.$revoke();
}
