import { resolver } from "@blitzjs/rpc";
import { Ctx, NotFoundError } from "blitz";
import db from "db";
import { z } from "zod";

const GetWrappedFeatureCollection = z.object({
  id: z.string(),
});

/**
 * Security: requires you to be logged in, returns true
 * if you can also access this collection.
 */
const getCanAccessWrappedFeatureCollection = resolver.pipe(
  resolver.zod(GetWrappedFeatureCollection),
  async (input, ctx: Ctx) => {
    try {
      ctx.session.$authorize();
      await db.wrappedFeatureCollection.findFirstOrThrow({
        where: {
          id: input.id,
          organizationId: ctx.session.orgId,
        },
      });
      return true;
    } catch (e) {
      throw new NotFoundError();
    }
  }
);

export default getCanAccessWrappedFeatureCollection;
