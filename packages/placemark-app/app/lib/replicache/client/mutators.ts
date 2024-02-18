import { mutatorSchema } from "app/lib/replicache/validations";
import { applyValidators } from "app/lib/replicache/validation_utils";
import { storage } from "app/lib/replicache/client/storage";
import { IWrappedFeature } from "types";

/**
 * REPLICACHE: CLIENT
 */
export const clientMutators = applyValidators(mutatorSchema, {
  async putPresence(tx, presence) {
    await storage(tx).updatePresence(presence);
  },
  async deleteFolders(tx, { folders, wrappedFeatureCollectionId }) {
    await storage(tx).deleteFolders(folders, wrappedFeatureCollectionId);
  },
  async putFolders(tx, { folders, wrappedFeatureCollectionId }) {
    const s = storage(tx);
    await Promise.all(
      folders.map((folder) =>
        s.updateFolder(folder, wrappedFeatureCollectionId)
      )
    );
  },
  async deleteFeatures(tx, { features, wrappedFeatureCollectionId }) {
    await storage(tx).deleteFeatures(features, wrappedFeatureCollectionId);
  },
  async putFeatures(tx, { features, wrappedFeatureCollectionId }) {
    const s = storage(tx);
    await Promise.all(
      features.map((feature) =>
        s.updateFeature(feature as IWrappedFeature, wrappedFeatureCollectionId)
      )
    );
  },
  async putLayerConfigs(tx, { layerConfigs, wrappedFeatureCollectionId }) {
    await storage(tx).putLayerConfigs(layerConfigs, wrappedFeatureCollectionId);
  },
  async deleteLayerConfigs(tx, { layerConfigs, wrappedFeatureCollectionId }) {
    await storage(tx).deleteLayerConfigs(
      layerConfigs,
      wrappedFeatureCollectionId
    );
  },
});
