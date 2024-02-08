import { resolver } from "@blitzjs/rpc";
import db from "db";
import { DuplicateWrappedFeatureCollection } from "app/wrappedFeatureCollections/validations";
import { nanoid, newFeatureId } from "app/lib/id";
import {
  getNextVersion,
  getWrappedFeatureCollection,
} from "app/lib/utils_server";
import { capture } from "integrations/posthog";

/**
 * Security: makes sure that the source wfc is owned
 * by your organization.
 */
export default resolver.pipe(
  resolver.zod(DuplicateWrappedFeatureCollection),
  resolver.authorize(),
  async ({ id: sourceId }, ctx) => {
    return db.$transaction(async (db) => {
      const version = await getNextVersion(db);

      /**
       * Get source data
       */
      const sourceWfc = await getWrappedFeatureCollection(sourceId, ctx);

      const [sourceFolders, sourceFeatures, sourceLayerConfigs] =
        await Promise.all([
          db.folder.findMany({
            select: {
              name: true,
              id: true,
              visibility: true,
              at: true,
              folderId: true,
              expanded: true,
            },
            where: {
              wrappedFeatureCollectionId: sourceId,
              deleted: false,
            },
          }),
          db.wrappedFeature.findMany({
            select: {
              feature: true,
              at: true,
              folderId: true,
            },
            where: {
              wrappedFeatureCollectionId: sourceId,
              deleted: false,
            },
          }),
          db.layerConfig.findMany({
            where: {
              wrappedFeatureCollectionId: sourceId,
              deleted: false,
            },
          }),
        ]);

      const idRemap = new Map<string, string>();

      for (const folder of sourceFolders) {
        idRemap.set(folder.id, newFeatureId());
      }

      /**
       * Create duplicates
       */

      const { id: newWfcId } = await db.wrappedFeatureCollection.create({
        data: {
          id: nanoid(),
          name: `${sourceWfc.name} (copy)`,
          label: sourceWfc.label,
          description: sourceWfc.description,
          access: sourceWfc.access,
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
        data: sourceFolders.map((sourceFolder) => {
          return {
            ...sourceFolder,
            id: idRemap.get(sourceFolder.id),
            version,
            folderId: sourceFolder.folderId
              ? idRemap.get(sourceFolder.folderId)
              : null,
            createdById: ctx.session.userId,
            wrappedFeatureCollectionId: newWfcId,
          };
        }),
      });

      await db.wrappedFeature.createMany({
        data: sourceFeatures.map((sourceFeature) => {
          return {
            ...sourceFeature,
            id: newFeatureId(),
            version,
            feature: sourceFeature.feature!,
            folderId: sourceFeature.folderId
              ? idRemap.get(sourceFeature.folderId)
              : null,
            createdById: ctx.session.userId,
            wrappedFeatureCollectionId: newWfcId,
          };
        }),
      });

      await db.layerConfig.createMany({
        data: sourceLayerConfigs.map((layerConfig) => {
          const { createdAt, updatedAt, ...rest } = layerConfig;
          return {
            ...rest,
            id: newFeatureId(),
            version,
            wrappedFeatureCollectionId: newWfcId,
          };
        }),
      });

      capture(ctx, {
        event: "map-duplicate",
      });

      return newWfcId;
    });
  }
);
