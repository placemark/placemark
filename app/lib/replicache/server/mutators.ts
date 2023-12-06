import type { mutatorSchema } from "app/lib/replicache/validations";
import type { PushMutators } from "app/lib/replicache/validation_utils";
import { ServerStorage } from "app/lib/replicache/server/storage";
import { IWrappedFeature } from "types";

export const mutators: PushMutators<typeof mutatorSchema> = {
  async deleteFolders(
    { folders, wrappedFeatureCollectionId },
    { version, client, session, clientID }
  ) {
    const s = new ServerStorage(client, version, session, clientID);
    await s.deleteFolders(folders, wrappedFeatureCollectionId);
  },
  async putFolders(
    { folders, wrappedFeatureCollectionId },
    { version, client, session, clientID }
  ) {
    const s = new ServerStorage(client, version, session, clientID);
    await s.putFolders(folders, wrappedFeatureCollectionId);
  },
  async putPresence(presence, { version, client, session, clientID }) {
    const s = new ServerStorage(client, version, session, clientID);
    await s.putPresence(presence);
  },
  async putFeatures(
    { features, wrappedFeatureCollectionId },
    { version, client, session, clientID }
  ) {
    if (features.length === 0) return;
    const s = new ServerStorage(client, version, session, clientID);
    await s.putFeatures(
      features as IWrappedFeature[],
      wrappedFeatureCollectionId
    );
  },
  async deleteFeatures(
    { features, wrappedFeatureCollectionId },
    { version, client, session, clientID }
  ) {
    if (features.length === 0) return;
    const s = new ServerStorage(client, version, session, clientID);
    await s.deleteFeatures(features, wrappedFeatureCollectionId);
  },

  async putLayerConfigs(
    { layerConfigs, wrappedFeatureCollectionId },
    { version, client, session, clientID }
  ) {
    if (layerConfigs.length === 0) return;
    const s = new ServerStorage(client, version, session, clientID);
    await s.putLayerConfigs(layerConfigs, wrappedFeatureCollectionId);
  },
  async deleteLayerConfigs(
    { layerConfigs, wrappedFeatureCollectionId },
    { version, client, session, clientID }
  ) {
    if (layerConfigs.length === 0) return;
    const s = new ServerStorage(client, version, session, clientID);
    await s.deleteLayerConfigs(layerConfigs, wrappedFeatureCollectionId);
  },
};
