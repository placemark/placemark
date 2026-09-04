import { layerConfigLayerId } from "app/lib/layer_config_adapters";
import { FIRST_EDITING_LAYER_NAME } from "app/lib/load_and_augment_style";
import type * as maplibregl from "maplibre-gl";
import { toast } from "react-hot-toast";
import type { ILayerConfig, LayerConfigMap } from "types";

export type AllmapsLayerConfig = Extract<ILayerConfig, { type: "ALLMAPS" }>;

type WarpedMapLayerInstance = maplibregl.CustomLayerInterface & {
  addGeoreferenceAnnotationByUrl: (url: string) => Promise<unknown> | unknown;
  getBounds: () => maplibregl.LngLatBoundsLike | undefined;
  getCenterZoomBearing: (
    options?: maplibregl.CameraForBoundsOptions,
  ) => maplibregl.CenterZoomBearing;
  setLayerOptions: (options: {
    saturation?: number;
    visible?: boolean;
  }) => void;
  setOpacity: (opacity: number) => void;
};

type AllmapsMapLibreModule = {
  WarpedMapLayer: new (options: {
    layerId: string;
    opacity: number;
    saturation: number;
    visible: boolean;
  }) => WarpedMapLayerInstance;
};

type CachedAllmapsLayer = {
  layer: WarpedMapLayerInstance;
  url: string;
};

export type AllmapsLayerCache = Map<string, CachedAllmapsLayer>;

let allmapsModulePromise: Promise<AllmapsMapLibreModule> | null = null;
const ALLMAPS_LAYER_ID_PREFIX = "placemarkAllmapsLayer:";

async function loadAllmapsMapLibre() {
  allmapsModulePromise =
    allmapsModulePromise ||
    (import("@allmaps/maplibre") as unknown as Promise<AllmapsMapLibreModule>);
  try {
    return await allmapsModulePromise;
  } catch (e) {
    allmapsModulePromise = null;
    throw e;
  }
}

export function allmapsLayerId(layerConfigId: string) {
  return `${ALLMAPS_LAYER_ID_PREFIX}${layerConfigId}`;
}

function isAllmapsLayer(layer: ILayerConfig): layer is AllmapsLayerConfig {
  return layer.type === "ALLMAPS";
}

export function getAllmapsLayerConfigs(layerConfigs: LayerConfigMap) {
  return [...layerConfigs.values()].filter(isAllmapsLayer);
}

export function getCachedAllmapsLayer(
  layerCache: AllmapsLayerCache,
  layerConfigId: string,
) {
  return layerCache.get(allmapsLayerId(layerConfigId))?.layer;
}

function getSaturation(layerConfig: AllmapsLayerConfig) {
  return layerConfig.saturation ?? 1;
}

function getRenderedLayerId(layer: ILayerConfig) {
  switch (layer.type) {
    case "ALLMAPS":
      return allmapsLayerId(layer.id);
    case "TILEJSON":
    case "XYZ":
      return layerConfigLayerId(layer);
    case "STYLE":
      return null;
  }
}

function getFirstMapLibreStyleLayerId(map: maplibregl.Map) {
  for (const layer of map.getStyle().layers ?? []) {
    if (layer.id === FIRST_EDITING_LAYER_NAME) {
      return FIRST_EDITING_LAYER_NAME;
    }

    if (
      !layer.id.startsWith(ALLMAPS_LAYER_ID_PREFIX) &&
      !layer.id.startsWith("placemarkInternalLayer:")
    ) {
      return layer.id;
    }
  }

  return map.getLayer(FIRST_EDITING_LAYER_NAME)
    ? FIRST_EDITING_LAYER_NAME
    : undefined;
}

function getBeforeLayerId({
  map,
  layerConfig,
  layerConfigs,
}: {
  map: maplibregl.Map;
  layerConfig: AllmapsLayerConfig;
  layerConfigs: LayerConfigMap;
}) {
  const layers = [...layerConfigs.values()];
  const index = layers.findIndex((layer) => layer.id === layerConfig.id);

  for (let i = index - 1; i >= 0; i--) {
    if (layers[i].type === "STYLE") {
      return getFirstMapLibreStyleLayerId(map);
    }

    const renderedLayerId = getRenderedLayerId(layers[i]);
    if (renderedLayerId && map.getLayer(renderedLayerId)) {
      return renderedLayerId;
    }
  }

  return map.getLayer(FIRST_EDITING_LAYER_NAME)
    ? FIRST_EDITING_LAYER_NAME
    : undefined;
}

function removeLayerIfPresent(map: maplibregl.Map, layerId: string) {
  if (map.getLayer(layerId)) {
    map.removeLayer(layerId);
  }
}

function removeCachedLayer({
  map,
  layerCache,
  layerId,
  layer,
}: {
  map: maplibregl.Map;
  layerCache: AllmapsLayerCache;
  layerId: string;
  layer: WarpedMapLayerInstance;
}) {
  if (layerCache.get(layerId)?.layer === layer) {
    removeLayerIfPresent(map, layerId);
    layerCache.delete(layerId);
  }
}

async function getCachedLayer({
  layerCache,
  layerConfig,
}: {
  layerCache: AllmapsLayerCache;
  layerConfig: AllmapsLayerConfig;
}) {
  const layerId = allmapsLayerId(layerConfig.id);
  const cachedLayer = layerCache.get(layerId);
  if (cachedLayer) {
    return cachedLayer;
  }

  const { WarpedMapLayer } = await loadAllmapsMapLibre();
  const layer = new WarpedMapLayer({
    layerId,
    opacity: layerConfig.opacity,
    saturation: getSaturation(layerConfig),
    visible: layerConfig.visibility,
  });
  const nextCachedLayer = {
    layer,
    url: layerConfig.url,
  };
  layerCache.set(layerId, nextCachedLayer);
  return nextCachedLayer;
}

function moveLayerIfPresent({
  map,
  layerId,
  beforeId,
}: {
  map: maplibregl.Map;
  layerId: string;
  beforeId?: string;
}) {
  if (!map.getLayer(layerId)) {
    return false;
  }

  try {
    map.moveLayer(layerId, beforeId);
  } catch (e) {
    if (!map.getLayer(layerId)) {
      throw e;
    }
  }

  return true;
}

async function addLayerIfMissing({
  map,
  layerId,
  cachedLayer,
  layerConfig,
  beforeId,
}: {
  map: maplibregl.Map;
  layerId: string;
  cachedLayer: CachedAllmapsLayer;
  layerConfig: AllmapsLayerConfig;
  beforeId?: string;
}) {
  if (moveLayerIfPresent({ map, layerId, beforeId })) {
    return;
  }

  try {
    map.addLayer(cachedLayer.layer, beforeId);
  } catch (e) {
    if (moveLayerIfPresent({ map, layerId, beforeId })) {
      return;
    }
    throw e;
  }

  await cachedLayer.layer.addGeoreferenceAnnotationByUrl(layerConfig.url);
}

function syncLayerOptions({
  cachedLayer,
  layerConfig,
}: {
  cachedLayer: CachedAllmapsLayer;
  layerConfig: AllmapsLayerConfig;
}) {
  try {
    cachedLayer.layer.setOpacity(layerConfig.opacity);
    cachedLayer.layer.setLayerOptions({
      saturation: getSaturation(layerConfig),
      visible: layerConfig.visibility,
    });
  } catch (_e) {
    // During Vite HMR, MapLibre can retain the visible custom layer while the
    // module cache recreates this helper around a fresh unattached instance.
    // The next full style sync will reconnect the instance; avoid a false
    // "failed to load" toast for this dev-only renderer timing issue.
  }
}

export async function syncAllmapsLayers({
  map,
  layerCache,
  layerConfigs,
  isStale,
}: {
  map: maplibregl.Map;
  layerCache: AllmapsLayerCache;
  layerConfigs: LayerConfigMap;
  isStale?: () => boolean;
}) {
  if (isStale?.()) {
    return;
  }

  const allmapsLayerConfigs = getAllmapsLayerConfigs(layerConfigs);
  const desiredLayerConfigs = new Map(
    allmapsLayerConfigs.map((layerConfig) => [
      allmapsLayerId(layerConfig.id),
      layerConfig,
    ]),
  );

  for (const [layerId, cachedLayer] of [...layerCache]) {
    const layerConfig = desiredLayerConfigs.get(layerId);
    if (!layerConfig || layerConfig.url !== cachedLayer.url) {
      removeLayerIfPresent(map, layerId);
      layerCache.delete(layerId);
    }
  }

  if (!allmapsLayerConfigs.length) {
    return;
  }

  if (isStale?.()) {
    return;
  }

  for (const layerConfig of allmapsLayerConfigs) {
    if (isStale?.()) {
      return;
    }

    const layerId = allmapsLayerId(layerConfig.id);
    let cachedLayer: CachedAllmapsLayer;
    try {
      cachedLayer = await getCachedLayer({ layerCache, layerConfig });
    } catch (_e) {
      toast.error("Allmaps failed to load");
      return;
    }

    try {
      const beforeId = getBeforeLayerId({ map, layerConfig, layerConfigs });
      await addLayerIfMissing({
        map,
        layerId,
        cachedLayer,
        layerConfig,
        beforeId,
      });
      if (isStale?.()) {
        removeCachedLayer({
          map,
          layerCache,
          layerId,
          layer: cachedLayer.layer,
        });
        return;
      }
    } catch (_e) {
      removeCachedLayer({
        map,
        layerCache,
        layerId,
        layer: cachedLayer.layer,
      });
      toast.error("An Allmaps layer failed to load");
      continue;
    }

    syncLayerOptions({ cachedLayer, layerConfig });
  }
}
