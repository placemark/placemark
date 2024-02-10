import { resolver } from "@blitzjs/rpc";
import db from "db";
import { CreateWrappedFeatureCollectionWithFeatures } from "app/wrappedFeatureCollections/validations";
import { nanoid } from "app/lib/id";
import { createDefaultLayerConfig, getNextVersion } from "app/lib/utils_server";

export default resolver.pipe(
  resolver.zod(CreateWrappedFeatureCollectionWithFeatures),
  resolver.authorize(),
  ({ name, wrappedFeatures, folders }, ctx) => {
    return db.$transaction(async (db) => {
      const version = await getNextVersion(db);

      const { id: wrappedFeatureCollectionId } =
        await db.wrappedFeatureCollection.create({
          data: {
            id: nanoid(),
            name,
            organization: {
              connect: {
                id: ctx.session.orgId!,
              },
            },

            createdBy: {
              connect: {
                id: ctx.session.userId,
              },
            },
          },
        });

      await db.folder.createMany({
        data: folders.map((folder) => {
          return {
            ...folder,
            wrappedFeatureCollectionId,
            version,
          };
        }),
      });

      await createDefaultLayerConfig({
        version,
        id: wrappedFeatureCollectionId,
        db,
      });

      await db.wrappedFeature.createMany({
        data: wrappedFeatures.map((wrappedFeature) => {
          const { folderId, id, at, feature } = wrappedFeature;
          return {
            id,
            at,
            folderId,
            feature: feature as any,
            wrappedFeatureCollectionId,
            version,
          };
        }),
      });

      return wrappedFeatureCollectionId;
    });
  }
);
