import { resolver } from "@blitzjs/rpc";
import db from "db";
import { CreateWrappedFeatureCollectionFolder } from "app/wrappedFeatureCollectionFolders/validations";

export default resolver.pipe(
  resolver.zod(CreateWrappedFeatureCollectionFolder),
  resolver.authorize(),
  async ({ name, folderId }, ctx) => {
    const folder = folderId
      ? {
          folder: {
            connect: {
              id: folderId,
            },
          },
        }
      : {};
    const { id } = await db.wrappedFeatureCollectionFolder.create({
      data: {
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

    return id;
  }
);
