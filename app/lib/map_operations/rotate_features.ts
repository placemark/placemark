import { Geometry, IWrappedFeature } from "types";
import cloneDeep from "lodash/cloneDeep";
import center from "@turf/center";
import {
  lineRotate,
  polygonRotate,
  pointRotate,
  Point,
  Line,
  Polygon,
} from "geometric";
import type { LngLat } from "mapbox-gl";

type LL = Pick<LngLat, "lng" | "lat">;

export function rotateFeatures(
  wrappedFeatures: IWrappedFeature[],
  a: LL | null,
  b: LL
) {
  if (!a) return wrappedFeatures;

  const centroid = center({
    type: "FeatureCollection",
    features: wrappedFeatures
      .filter((f) => f)
      .map((f) => f.feature)
      .filter((f) => f.geometry) as any,
  }).geometry.coordinates as [number, number];

  const a1 = Math.atan2(centroid[0] - a.lng, centroid[1] - a.lat);
  const a2 = Math.atan2(centroid[0] - b.lng, centroid[1] - b.lat);
  const angle = (a1 - a2) * (180 / Math.PI);

  return wrappedFeatures.map((wrappedFeature) => {
    function rotateGeometry(geometry: Geometry) {
      if (geometry) {
        switch (geometry.type) {
          case "Point": {
            geometry.coordinates = pointRotate(
              geometry.coordinates as Point,
              angle,
              centroid
            );
            break;
          }
          case "GeometryCollection": {
            geometry.geometries.forEach((geometry) => {
              rotateGeometry(geometry);
            });
            break;
          }
          case "MultiPoint": {
            geometry.coordinates = geometry.coordinates.map((point) => {
              return pointRotate(point as Point, angle, centroid);
            });
            break;
          }
          case "MultiPolygon": {
            geometry.coordinates = geometry.coordinates.map((polygon) => {
              return polygon.map((ring) => {
                return polygonRotate(ring as Polygon, angle, centroid);
              });
            });
            break;
          }
          case "Polygon": {
            geometry.coordinates = geometry.coordinates.map((ring) => {
              return polygonRotate(ring as Polygon, angle, centroid);
            });
            break;
          }
          case "LineString": {
            geometry.coordinates = lineRotate(
              geometry.coordinates as unknown as Line,
              angle,
              centroid
            );
            break;
          }
          case "MultiLineString": {
            geometry.coordinates = geometry.coordinates.map((line) => {
              return lineRotate(line as unknown as Line, angle, centroid);
            });
            break;
          }
        }
      }
      return geometry;
    }

    return {
      ...wrappedFeature,
      feature: {
        ...wrappedFeature.feature,
        geometry: wrappedFeature.feature.geometry
          ? rotateGeometry(cloneDeep(wrappedFeature.feature.geometry))
          : null,
      },
    };
  });
}
