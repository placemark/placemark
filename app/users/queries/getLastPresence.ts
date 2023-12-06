import { resolver } from "@blitzjs/rpc";
import { z } from "zod";
import db from "db";

const GetLastPresence = z.object({
  wrappedFeatureCollectionId: z.string(),
});

export async function getLastPresenceInner(
  wrappedFeatureCollectionId: string,
  userId: number
) {
  return await db.presence.findFirst({
    where: {
      replicacheClient: {
        userId,
      },
      wrappedFeatureCollectionId,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });
}

const getLastPresence = resolver.pipe(
  resolver.zod(GetLastPresence),
  resolver.authorize(),
  async ({ wrappedFeatureCollectionId }, ctx) => {
    return getLastPresenceInner(wrappedFeatureCollectionId, ctx.session.userId);
  }
);

export default getLastPresence;
