import { resolver } from "@blitzjs/rpc";
import db from "db";
import { capture } from "integrations/posthog";
import { EditWrappedFeatureCollectionFolder } from "app/wrappedFeatureCollectionFolders/validations";

export default resolver.pipe(
  resolver.zod(EditWrappedFeatureCollectionFolder),
  resolver.authorize(),
  async ({ id, name, folderId }, ctx) => {
    await db.wrappedFeatureCollectionFolder.update({
      where: {
        id,
      },
      data: {
        name,
        folderId: folderId || null,
      },
    });

    capture(ctx, {
      event: "folder-update",
    });

    return id;
  }
);
