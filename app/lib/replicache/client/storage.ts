import type { JSONValue, WriteTransaction } from "replicache";
import {
  Presence,
  WrappedFeature,
  Folder,
  IFolder,
  IPresence,
  IWrappedFeature,
  ILayerConfig,
} from "types";
// import type { IPutCursor } from "lib/replicache/validations";
import type { IStorage } from "app/lib/replicache/istorage";
import * as keys from "app/lib/replicache/keys";

export class Storage implements IStorage {
  private tx: WriteTransaction;

  constructor(tx: WriteTransaction) {
    this.tx = tx;
  }

  async deleteFolders(
    ids: readonly string[],
    wrappedFeatureCollectionId: string
  ) {
    await Promise.all(
      ids.map((id) =>
        this.tx.del(
          keys.folder({
            id,
            wrappedFeatureCollectionId,
          })
        )
      )
    );
  }

  async deleteFeatures(
    ids: readonly string[],
    wrappedFeatureCollectionId: string
  ) {
    await Promise.all(
      ids.map((id) =>
        this.tx.del(
          keys.feature({
            id,
            wrappedFeatureCollectionId,
          })
        )
      )
    );
  }

  /**
   * Put a feature in the datastore. This validates the feature.
   */
  async updatePresence(
    inputPresence: Omit<IPresence, "replicacheClientId">
  ): Promise<void> {
    const presence: IPresence = {
      ...inputPresence,
      replicacheClientId: this.tx.clientID,
    };
    return await this.tx.put(keys.presence(presence), Presence.parse(presence));
  }

  /**
   * Put a feature in the datastore. This validates the feature.
   */
  async updateFolder(
    folder: IFolder,
    wrappedFeatureCollectionId: string
  ): Promise<void> {
    return await this.tx.put(
      keys.folder({
        id: folder.id,
        wrappedFeatureCollectionId,
      }),
      Folder.parse(folder) as JSONValue
    );
  }

  /**
   * Put a feature in the datastore. This validates the feature.
   */
  async putFeature(
    feature: IWrappedFeature,
    wrappedFeatureCollectionId: string
  ): Promise<void> {
    return await this.tx.put(
      keys.feature({
        id: feature.id,
        wrappedFeatureCollectionId,
      }),
      WrappedFeature.parse(feature) as unknown as JSONValue
    );
  }

  async putLayerConfigs(
    layerConfigs: ILayerConfig[],
    wrappedFeatureCollectionId: string
  ): Promise<void> {
    await Promise.all(
      layerConfigs.map((layerConfig) => {
        return this.putLayerConfig(layerConfig, wrappedFeatureCollectionId);
      })
    );
  }

  /**
   * Put a feature in the datastore. This validates the feature.
   */
  async putLayerConfig(
    layerConfig: ILayerConfig,
    wrappedFeatureCollectionId: string
  ): Promise<void> {
    return await this.tx.put(
      keys.layerConfig({
        id: layerConfig.id,
        wrappedFeatureCollectionId,
      }),
      // TODO: parse
      layerConfig as unknown as JSONValue
      // WrappedFeature.parse(feature) as unknown as JSONValue
    );
  }

  async deleteLayerConfigs(
    ids: readonly string[],
    wrappedFeatureCollectionId: string
  ) {
    await Promise.all(
      ids.map((id) =>
        this.tx.del(
          keys.layerConfig({
            id,
            wrappedFeatureCollectionId,
          })
        )
      )
    );
  }

  async putFeatures(
    features: IWrappedFeature[],
    wrappedFeatureCollectionId: string
  ): Promise<void> {
    await Promise.all(
      features.map((feature) => {
        return this.putFeature(feature, wrappedFeatureCollectionId);
      })
    );
  }

  /**
   * Put a feature in the datastore. This validates the feature.
   */
  async updateFeature(
    feature: IWrappedFeature,
    wrappedFeatureCollectionId: string
  ): Promise<void> {
    return await this.tx.put(
      keys.feature({
        id: feature.id,
        wrappedFeatureCollectionId,
      }),
      feature as unknown as JSONValue
    );
  }
}

export function storage(tx: WriteTransaction) {
  return new Storage(tx);
}
