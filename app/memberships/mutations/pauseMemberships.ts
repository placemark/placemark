import { resolver } from "@blitzjs/rpc";
import { PauseMemberships } from "app/memberships/validations";
import { capture } from "integrations/posthog";
import { toggleMemberships } from "app/lib/utils_server";

export default resolver.pipe(
  resolver.zod(PauseMemberships),
  resolver.authorize(),
  async ({}, ctx) => {
    /**
     * Make all of this users memberships paused
     */
    await toggleMemberships(ctx.session.userId, "PAUSED");

    capture(ctx, {
      event: "membership-pause",
    });

    return true;
  }
);
