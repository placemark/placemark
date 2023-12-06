import { Data, Sel } from "state/jotai";
import { newFeatureId } from "app/lib/id";
import { MomentInput } from "app/lib/persistence/moment";
import { GeoJsonProperties, Geometry } from "types";
import { ModeWithOptions, USelection } from "state";
import { e6position } from "app/lib/geometry";

type PutFeature = MomentInput["putFeatures"][0];

export function getMapCoord(
  e: mapboxgl.MapMouseEvent | mapboxgl.MapTouchEvent
) {
  return e6position(e.lngLat.toArray(), 7) as Pos2;
}

export function createOrUpdateFeature({
  mode,
  featureMap,
  geometry,
  selection,
  properties = {},
}: {
  selection: Sel;
  mode: ModeWithOptions;
  featureMap: Data["featureMap"];
  geometry: Geometry;
  properties?: GeoJsonProperties;
}): PutFeature {
  const id = newFeatureId();
  const replaceGeometryForId = mode.modeOptions?.replaceGeometryForId;
  const wrappedFeature =
    replaceGeometryForId && featureMap.get(replaceGeometryForId);

  if (wrappedFeature) {
    const p: PutFeature = {
      ...wrappedFeature,
      feature: {
        ...wrappedFeature.feature,
        geometry,
      },
    };

    return p;
  }

  return {
    id,
    folderId: USelection.folderId(selection),
    feature: {
      type: "Feature",
      properties,
      geometry,
    },
  };
}
