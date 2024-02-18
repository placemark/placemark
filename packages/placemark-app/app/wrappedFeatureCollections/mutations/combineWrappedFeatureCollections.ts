import { resolver } from "@blitzjs/rpc";
import db from "db";
import { nanoid, newFeatureId } from "app/lib/id";
import { z } from "zod";
import { NotFoundError } from "blitz";

const CombineWrappedFeatureCollection = z.object({
  ids: z.array(z.string()).min(2),
});

/**
 * Security: checks that the involved maps are in your
 * organization.
 */
export default resolver.pipe(
  resolver.zod(CombineWrappedFeatureCollection),
  resolver.authorize(),
  async ({ ids }, ctx) => {
    const collectionChecks = await db.wrappedFeatureCollection.findMany({
      where: {
        id: {
          in: ids,
        },
        organizationId: ctx.session.orgId!,
      },
    });

    if (collectionChecks.length !== ids.length) {
      throw new NotFoundError();
    }

    const wrappedFeatureCollectionFolderId =
      collectionChecks[0].wrappedFeatureCollectionFolderId;

    const layerConfigs = await db.layerConfig.findMany({
      where: {
        wrappedFeatureCollectionId: ids[0],
        deleted: false,
      },
    });

    const wrappedFeatures = await db.wrappedFeature.findMany({
      select: {
        at: true,
        feature: true,
        folderId: true,
        createdById: true,
      },
      where: {
        wrappedFeatureCollectionId: {
          in: ids,
        },
        deleted: false,
      },
    });

    const folders = await db.folder.findMany({
      select: {
        name: true,
        at: true,
        id: true,
      },
      where: {
        wrappedFeatureCollectionId: {
          in: ids,
        },
        deleted: false,
      },
    });

    // from → to
    const folderIdMap = new Map<string, string>();

    const wrappedFeatureCollectionId = nanoid();

    const newFolders = folders.map((folder) => {
      const id = newFeatureId();
      folderIdMap.set(folder.id, id);
      return {
        ...folder,
        version: 1,
        wrappedFeatureCollectionId,
        id,
      };
    });

    const newFeatures = wrappedFeatures.map((feature) => {
      return {
        at: feature.at,
        feature: feature.feature!,
        folderId: feature.folderId
          ? folderIdMap.get(feature.folderId) ?? null
          : null,
        version: 1,
        id: newFeatureId(),
        wrappedFeatureCollectionId,
      };
    });

    const newLayerConfigs = layerConfigs.map((layerConfig) => {
      return {
        ...layerConfig,
        version: 1,
        id: newFeatureId(),
        wrappedFeatureCollectionId,
        updatedAt: new Date(),
        createdAt: new Date(),
      };
    });

    const res = await db.$transaction([
      db.wrappedFeatureCollection.create({
        data: {
          id: wrappedFeatureCollectionId,
          ...(wrappedFeatureCollectionFolderId
            ? {
                wrappedFeatureCollectionFolder: {
                  connect: {
                    id: wrappedFeatureCollectionFolderId,
                  },
                },
              }
            : {}),
          name: "Combined map",
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
      }),
      db.layerConfig.createMany({
        data: newLayerConfigs,
      }),
      db.folder.createMany({
        data: newFolders,
      }),
      db.wrappedFeature.createMany({
        data: newFeatures,
      }),
    ]);

    return res?.[0]?.id;
  }
);
