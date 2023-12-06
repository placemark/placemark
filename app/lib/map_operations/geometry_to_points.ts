import type { Feature, Position, IFeature, Point, MultiPoint } from "types";
import { coordEach } from "@turf/meta";
import { AllGeoJSON } from "@turf/helpers";

export const geometryToPoints = (
  feature: Feature
): IFeature<Point | MultiPoint> | null => {
  const { geometry } = feature;

  if (geometry === null) return null;

  const coordinates: Position[] = [];

  coordEach(
    geometry as AllGeoJSON,
    (coord) => {
      coordinates.push(coord);
    },
    true
  );

  if (coordinates.length === 0) return null;

  if (coordinates.length === 1) {
    return {
      ...feature,
      geometry: {
        type: "Point",
        coordinates: coordinates[0],
      },
    };
  }

  return {
    ...feature,
    geometry: {
      type: "MultiPoint",
      coordinates: coordinates,
    },
  };
};
