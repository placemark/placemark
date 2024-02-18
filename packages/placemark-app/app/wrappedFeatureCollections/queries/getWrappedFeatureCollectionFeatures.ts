import { resolver } from "@blitzjs/rpc";
import { Ctx } from "blitz";
import db from "db";
import { IWrappedFeature } from "types";
import { z } from "zod";

const GetWrappedFeatureCollection = z.object({
  id: z.string(),
  cursor: z.string().optional(),
});

const CHUNK = 1000;

/**
 * Security: available to the public. Exposes published maps.
 *
 * Returns a list of features, in batches of 1000 features.
 */
const getWrappedFeatureCollectionFeatures = resolver.pipe(
  resolver.zod(GetWrappedFeatureCollection),
  async (input, _ctx: Ctx) => {
    const { cursor } = input;

    let cursorQuery = {};
    if (cursor) {
      cursorQuery = {
        cursor: {
          id: cursor,
        },
      };
    }

    const features = (await db.wrappedFeature.findMany({
      take: CHUNK + 1,
      ...cursorQuery,
      where: {
        wrappedFeatureCollectionId: input.id,
        deleted: false,
      },
    })) as unknown as IWrappedFeature[];

    let nextCursor: string | undefined;

    if (features.length === CHUNK + 1) {
      nextCursor = features[CHUNK].id;
    }

    return {
      items: features.slice(0, CHUNK),
      cursor: nextCursor,
    };
  }
);

export default getWrappedFeatureCollectionFeatures;
