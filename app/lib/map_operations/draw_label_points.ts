import { newFeatureId } from "app/lib/id";
import polylabel from "polylabel";
import { EMPTY_MOMENT, MomentInput } from "app/lib/persistence/moment";
import { USelection } from "state";
import { Sel } from "state/jotai";
import { IWrappedFeature } from "types";

export function centroidFeature(
  wrappedFeature: IWrappedFeature,
  coordinates: Pos2
): MomentInput["putFeatures"][number] {
  return {
    id: newFeatureId(),
    feature: {
      type: "Feature",
      properties: wrappedFeature.feature.properties,
      geometry: {
        type: "Point",
        coordinates,
      },
    },
    folderId: wrappedFeature.folderId,
  };
}

/**
 * Very basic centroid math here, the same as Turf.
 */
export function drawLabelPoints(wrappedFeatures: IWrappedFeature[]): {
  newSelection: Sel;
  moment: MomentInput;
} {
  const putFeatures: MomentInput["putFeatures"] = wrappedFeatures.flatMap(
    (wrappedFeature) => {
      const geometry = wrappedFeature.feature.geometry;
      if (geometry) {
        switch (geometry.type) {
          case "MultiPolygon": {
            return geometry.coordinates.map((polygon) => {
              // @ts-expect-error todo
              const center = polylabel(polygon) as Pos2;
              return centroidFeature(wrappedFeature, center);
            });
            break;
          }
          case "Polygon": {
            // @ts-expect-error todo
            const center = polylabel(geometry.coordinates) as Pos2;
            return centroidFeature(wrappedFeature, center);
            break;
          }
          default: {
            return [];
          }
        }
      }
      return [];
    }
  );

  return {
    newSelection: USelection.fromIds(putFeatures.map((f) => f.id)),
    moment: {
      ...EMPTY_MOMENT,
      note: "Added label points",
      track: "operation-label-points",
      putFeatures,
    },
  };
}
