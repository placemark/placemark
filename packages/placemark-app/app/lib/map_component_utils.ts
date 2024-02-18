import type {
  IWrappedFeature,
  Polygon,
  LineString,
  FeatureMap,
  FolderMap,
} from "types";
import type { Map as MapboxMap } from "mapbox-gl";
import { CLICKABLE_LAYERS } from "app/lib/load_and_augment_style";
import { bufferPoint } from "app/lib/geometry";
import type { EphemeralEditingStateLasso } from "state/jotai";
import { decodeId } from "app/lib/id";
import sortBy from "lodash/sortBy";
import { isFeatureLocked } from "./folder";
import { IDMap, UIDMap } from "./id_mapper";
import { getMapCoord } from "./handlers/utils";
import PMap from "app/lib/pmap";
import { DECK_SYNTHETIC_ID } from "app/lib/constants";

type MouseOrTouchEvent = mapboxgl.MapMouseEvent | mapboxgl.MapTouchEvent;

export function wrappedFeaturesFromMapFeatures(
  clickedFeatures: mapboxgl.MapboxGeoJSONFeature[],
  featureMap: FeatureMap,
  idMap: IDMap
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
  map: mapboxgl.Map
) {
  const tl = map.project(ephemeralState.box[0]);
  const br = map.project(ephemeralState.box[1]);
  const pxArea = Math.abs(tl.x - br.x) * Math.abs(tl.y - br.y);
  return pxArea < 5;
}

const QRF_OPTIONS: Parameters<MapboxMap["queryRenderedFeatures"]>[1] = {
  layers: CLICKABLE_LAYERS,
  filter: ["!has", "lasso"],
};

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
    pmap,
  }: {
    idMap: IDMap;
    featureMap: FeatureMap;
    folderMap: FolderMap;
    pmap: PMap;
  }
) {
  const map = e.target;

  const ids: RawId[] = [];

  const pickInfo = pmap.overlay.pickObject({
    ...e.point,
    layerIds: [DECK_SYNTHETIC_ID],
  });

  if (pickInfo) {
    ids.push(pickInfo.object.id as RawId);
  } else {
    const multiPickInfo = pmap.overlay.pickMultipleObjects({
      ...e.point,
      radius: 10,
      layerIds: [DECK_SYNTHETIC_ID],
    });

    if (multiPickInfo) {
      for (const info of multiPickInfo) {
        ids.push(info.object.id as RawId);
      }
    }
  }

  let mapFeatures = map.queryRenderedFeatures(e.point, QRF_OPTIONS);
  if (!mapFeatures.length) {
    mapFeatures = map.queryRenderedFeatures(bufferPoint(e.point), QRF_OPTIONS);
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
