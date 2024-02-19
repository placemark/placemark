import { resolver } from "@blitzjs/rpc";
import db from "db";
import { EditWrappedFeatureCollectionFolder } from "app/wrappedFeatureCollectionFolders/validations";

export default resolver.pipe(
  resolver.zod(EditWrappedFeatureCollectionFolder),
  resolver.authorize(),
  async ({ id, name, folderId }) => {
    await db.wrappedFeatureCollectionFolder.update({
      where: {
        id,
      },
      data: {
        name,
        folderId: folderId || null,
      },
    });

    return id;
  }
);
