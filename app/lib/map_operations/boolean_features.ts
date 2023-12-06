import { union, intersection, difference, Geom } from "polygon-clipping";
import type { Feature, Position, GeoJsonProperties } from "types";
import { GeometryError } from "app/lib/errors";
import { Either, Left, Right } from "purify-ts/Either";
import * as Sentry from "@sentry/nextjs";

function featureFromAccumulatorAndProperties(
  accumulator: Geom,
  properties: GeoJsonProperties
): Feature {
  return {
    type: "Feature",
    properties: properties,
    geometry:
      accumulator.length === 1
        ? {
            type: "Polygon",
            coordinates: accumulator[0] as Position[][],
          }
        : {
            type: "MultiPolygon",
            coordinates: accumulator as Position[][][],
          },
  };
}

export type BooleanOp = "union" | "intersection" | "difference";

function applyOp(op: BooleanOp, features: Geom[]) {
  return op === "union"
    ? union(features[0], ...features.slice(1))
    : op === "intersection"
    ? intersection(features[0], ...features.slice(1))
    : difference(features[0], ...features.slice(1));
}

export function booleanFeatures(
  features: Feature[],
  { op }: { op: BooleanOp }
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
      geometriesToClip.push(feature.geometry.coordinates as Geom);
    } else {
      newFeatures.push(feature);
    }
  }

  try {
    const result = applyOp(op, geometriesToClip);

    if (result.length) {
      newFeatures.push(featureFromAccumulatorAndProperties(result, properties));
    }

    return Right(newFeatures);
  } catch (e) {
    Sentry.captureException(e);
    return Left(new GeometryError("Failed to transform geometries"));
  }
}
