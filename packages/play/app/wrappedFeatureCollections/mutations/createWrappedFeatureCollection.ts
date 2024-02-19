import { resolver } from "@blitzjs/rpc";
import db from "db";
import { CreateWrappedFeatureCollection } from "app/wrappedFeatureCollections/validations";
import { nanoid } from "app/lib/id";
import { createDefaultLayerConfig, getNextVersion } from "app/lib/utils_server";

export default resolver.pipe(
  resolver.zod(CreateWrappedFeatureCollection),
  resolver.authorize(),
  async ({ name, folderId }, ctx) => {
    return db.$transaction(async (db) => {
      const version = await getNextVersion(db);

      const folder = folderId
        ? {
            wrappedFeatureCollectionFolder: {
              connect: {
                id: folderId,
              },
            },
          }
        : {};

      const { id } = await db.wrappedFeatureCollection.create({
        data: {
          id: nanoid(),
          name,
          ...folder,
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

      await createDefaultLayerConfig({
        db,
        version,
        id,
      });

      return id;
    });
  }
);
