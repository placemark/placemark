import type { IFeature, CoordinateHavers } from "types";

export default function replaceCoordinates<T extends CoordinateHavers>(
  feature: IFeature<T>,
  coordinates: T["coordinates"]
): IFeature<T> {
  return {
    ...feature,
    geometry: {
      ...feature.geometry,
      coordinates,
    },
  };
}
