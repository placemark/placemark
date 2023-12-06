import type { IWrappedFeature } from "types";

export interface FeatureSpec {
  wrappedFeatureCollectionId: string;
  id: string;
}

export interface IStorage {
  deleteFeatures(
    id: string[],
    wrappedFeatureCollectionId: string
  ): Promise<void>;

  /**
   * Put a feature in the datastore. This validates the feature.
   */
  putFeatures(
    features: IWrappedFeature[],
    wrappedFeatureCollectionId: string
  ): Promise<void>;
}
