import { resolver } from "@blitzjs/rpc";
import { PauseMemberships } from "app/memberships/validations";
import { toggleMemberships } from "app/lib/utils_server";

export default resolver.pipe(
  resolver.zod(PauseMemberships),
  resolver.authorize(),
  async ({}, ctx) => {
    /**
     * Make all of this users memberships paused
     */
    await toggleMemberships(ctx.session.userId, "PAUSED");

    return true;
  }
);
