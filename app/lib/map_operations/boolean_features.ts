import { GeometryError } from "app/lib/errors";
import { captureException } from "integrations/errors";
import {
  difference,
  type GeoJSONMultiPolygon,
  type GeoJSONPolygon,
  heal,
  intersectAll,
  type KernelResult,
  toGeoJSON,
  unionAll,
} from "polystrata";
import { type Either, Left, Right } from "purify-ts/Either";
import type { Feature, GeoJsonProperties, Geometry } from "types";

type Geom = GeoJSONMultiPolygon | GeoJSONPolygon;

function featureFromAccumulatorAndProperties(
  accumulator: KernelResult,
  properties: GeoJsonProperties,
): Feature {
  return {
    type: "Feature",
    properties: properties,
    geometry: toGeoJSON(accumulator) as Geometry,
  };
}

export type BooleanOp = "union" | "intersection" | "difference";

function applyOp(op: BooleanOp, features: Geom[]): KernelResult {
  if (op === "union") return unionAll(features);
  if (op === "intersection") return intersectAll(features);
  const [first, ...rest] = features;
  return rest.reduce<KernelResult>(
    (acc, feature) => difference(toGeoJSON(acc), feature),
    heal(first),
  );
}

export function booleanFeatures(
  features: Feature[],
  { op }: { op: BooleanOp },
): Either<GeometryError, Feature[]> {
  if (features.length < 2)
    return Left(new GeometryError("At least 2 features should be selected"));

  const newFeatures = [];
  const properties = {};
  const geometriesToClip: Geom[] = [];

  for (const feature of features) {
    if (
      feature.geometry?.type === "Polygon" ||
      feature.geometry?.type === "MultiPolygon"
    ) {
      if (feature.properties) {
        Object.assign(properties, feature.properties);
      }
      geometriesToClip.push(feature.geometry as Geom);
    } else {
      newFeatures.push(feature);
    }
  }

  try {
    const result = applyOp(op, geometriesToClip);
    newFeatures.push(featureFromAccumulatorAndProperties(result, properties));
    return Right(newFeatures);
  } catch (e) {
    captureException(e);
    return Left(new GeometryError("Failed to transform geometries"));
  }
}
