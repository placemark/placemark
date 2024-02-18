import { PLACEMARK_FOLDER_PROP, PLACEMARK_ID_PROP } from "app/lib/constants";
import { e6feature, addBbox } from "app/lib/geometry";
import { rewindFeature } from "@placemarkio/geojson-rewind";
import cloneDeep from "lodash/cloneDeep";
import { FeatureCollection, FeatureMap, IWrappedFeature } from "types";
import { ExportOptions } from "..";

export function wrappedFeatureToExportable(
  wrappedFeature: IWrappedFeature,
  options: ExportOptions["geojsonOptions"]
) {
  let feature = cloneDeep(wrappedFeature.feature);
  const { id, folderId } = wrappedFeature;

  feature = options?.truncate ? e6feature(feature) : feature;

  if (options?.addBboxes) {
    feature = addBbox(feature);
  }

  if (options?.includeId) {
    if (!feature.properties) {
      feature.properties = {};
    }
    feature.properties[PLACEMARK_ID_PROP] = id;
    if (folderId) {
      feature.properties[PLACEMARK_FOLDER_PROP] = folderId;
    }
  }

  return feature;
}

export function wrappedFeaturesToFeatureCollection(
  wrappedFeatures: IWrappedFeature[],
  options: ExportOptions["geojsonOptions"]
) {
  const features = wrappedFeatures.map((wrappedFeature) => {
    return wrappedFeatureToExportable(wrappedFeature, options);
  });

  const featureCollection: FeatureCollection = {
    type: "FeatureCollection",
    features,
  };

  return featureCollection;
}

export function geojsonToString(
  featureMap: FeatureMap,
  options: ExportOptions["geojsonOptions"]
) {
  const featureCollection: FeatureCollection = {
    type: "FeatureCollection",
    features: Array.from(featureMap.values(), (wrappedFeature) => {
      return rewindFeature(
        wrappedFeatureToExportable(wrappedFeature, options),
        options?.winding
      );
    }),
  };

  const stringified = options?.indent
    ? JSON.stringify(featureCollection, null, 4)
    : JSON.stringify(featureCollection);
  return stringified;
}
