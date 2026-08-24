import { bufferPoint } from "app/lib/geometry";
import { decodeId } from "app/lib/id";
import { CLICKABLE_LAYERS } from "app/lib/load_and_augment_style";
import sortBy from "lodash/sortBy";
import type {
  MapGeoJSONFeature,
  Map as MapLibreMap,
  MapMouseEvent,
  MapTouchEvent,
} from "maplibre-gl";
import type { EphemeralEditingStateLasso } from "state/jotai";
import type {
  FeatureMap,
  FolderMap,
  GeometryCollection,
  IWrappedFeature,
  LineString,
  Polygon,
} from "types";
import { isFeatureLocked } from "./folder";
import { getMapCoord } from "./handlers/utils";
import { type IDMap, UIDMap } from "./id_mapper";

type MouseOrTouchEvent = MapMouseEvent | MapTouchEvent;

export function wrappedFeaturesFromMapFeatures(
  clickedFeatures: MapGeoJSONFeature[],
  featureMap: FeatureMap,
  idMap: IDMap,
) {
  const set = new Set<IWrappedFeature>();
  const ids: { id: Id; wrappedFeature: IWrappedFeature }[] = [];
  for (const feature of clickedFeatures) {
    const uuid = UIDMap.getUUID(idMap, feature.id as RawId);
    const f = featureMap.get(uuid);
    if (f) {
      set.add(f);
      ids.push({ id: decodeId(feature.id as RawId), wrappedFeature: f });
    }
  }
  return {
    ids,
    features: sortBy(Array.from(set), "at"),
  };
}

export function newRouteFromClickEvent(
  e: MouseOrTouchEvent,
): GeometryCollection {
  const pos = getMapCoord(e);
  return {
    type: "GeometryCollection",
    geometries: [
      {
        type: "Point",
        coordinates: pos,
      },
      {
        type: "LineString",
        coordinates: [pos, pos],
      },
    ],
  };
}

export function newLineStringFromClickEvent(e: MouseOrTouchEvent): LineString {
  const pos = getMapCoord(e);
  return {
    type: "LineString",
    coordinates: [pos, pos],
  };
}

/**
 * Create a new, zero-area polygon from a position.
 */
export function newPolygonFromClickEvent(e: MouseOrTouchEvent): Polygon {
  const pos = getMapCoord(e);
  return {
    type: "Polygon",
    coordinates: [[pos, pos, pos]],
  };
}

export function isLassoTiny(
  ephemeralState: EphemeralEditingStateLasso,
  map: MapLibreMap,
) {
  const tl = map.project(ephemeralState.box[0]);
  const br = map.project(ephemeralState.box[1]);
  const pxArea = Math.abs(tl.x - br.x) * Math.abs(tl.y - br.y);
  return pxArea < 5;
}

/**
 * Select the feature under the cursor, or if there
 * is none, a feature within a fuzzy range of that cursor.
 */
export function fuzzyClick(
  e: MouseOrTouchEvent,
  {
    idMap,
    featureMap,
    folderMap,
  }: {
    idMap: IDMap;
    featureMap: FeatureMap;
    folderMap: FolderMap;
  },
) {
  const map = e.target;

  const ids: RawId[] = [];

  let mapFeatures = map.queryRenderedFeatures(e.point, {
    layers: CLICKABLE_LAYERS,
    filter: ["!has", "lasso"],
  });
  if (!mapFeatures.length) {
    mapFeatures = map.queryRenderedFeatures(bufferPoint(e.point), {
      layers: CLICKABLE_LAYERS,
      filter: ["!has", "lasso"],
    });
  }

  for (const feature of mapFeatures) {
    ids.push(feature.id as RawId);
  }

  const results: Array<{
    wrappedFeature: IWrappedFeature;
    decodedId: Id;
    id: RawId;
  }> = [];

  for (const id of ids) {
    const decodedId = decodeId(id);
    const uuid = UIDMap.getUUID(idMap, decodedId.featureId);
    const wrappedFeature = featureMap.get(uuid);
    if (wrappedFeature && !isFeatureLocked(wrappedFeature, folderMap)) {
      results.push({ wrappedFeature, decodedId, id });
    }
  }

  results.sort((a, b) => {
    return a.wrappedFeature.at > b.wrappedFeature.at ? -1 : 1;
  });

  return results[0] || null;
}
