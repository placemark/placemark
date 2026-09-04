import type {
  LayerSpecification,
  RasterLayerSpecification,
  StyleSpecification,
} from "@maplibre/maplibre-gl-style-spec";
import { getTileJSON } from "app/lib/utils";
import once from "lodash/once";
import { toast } from "react-hot-toast";
import type { ILayerConfig } from "types";

const warnOffline = once(() => {
  toast.error("Offline: falling back to blank background");
});

const EMPTY_STYLE: StyleSpecification = {
  version: 8,
  name: "Empty",
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {},
  layers: [],
};

async function fetchStyle(url: string): Promise<StyleSpecification> {
  return fetch(url)
    .then((res) => {
      if (!res.ok) {
        throw new Error("Could not fetch layer");
      }
      return res.json() as Promise<StyleSpecification>;
    })
    .catch(() => {
      warnOffline();
      return EMPTY_STYLE;
    });
}

export async function addMapLibreStyle(
  _base: StyleSpecification,
  layer: Extract<ILayerConfig, { type: "STYLE" }>,
): Promise<StyleSpecification> {
  const style = await fetchStyle(layer.url);
  return updateBaseStyle(style, {
    labelVisibility: layer.labelVisibility,
    rasterOpacity: layer.opacity,
    visibility: layer.visibility,
  });
}

function updateBaseStyle(
  style: StyleSpecification,
  options: {
    labelVisibility?: boolean;
    rasterOpacity?: number;
    visibility?: boolean;
  },
): StyleSpecification {
  const { labelVisibility = true, rasterOpacity, visibility = true } = options;

  if (!style.layers) {
    return style;
  }

  const updatedLayers = style.layers
    .map((layer) => {
      // Identify label layers
      const isLabelLayer =
        layer.type === "symbol" && layer.layout?.["text-field"] !== undefined;

      if (!labelVisibility && isLabelLayer) {
        return null;
      }

      if (!visibility) {
        return {
          ...layer,
          layout: {
            ...layer.layout,
            visibility: "none",
          },
        } as LayerSpecification;
      }

      if (layer.type === "raster" && rasterOpacity !== undefined) {
        return {
          ...layer,
          paint: {
            ...(layer.paint || {}),
            "raster-opacity": rasterOpacity,
          },
        };
      }

      return layer;
    })
    .filter(Boolean) as LayerSpecification[];

  return {
    ...style,
    layers: updatedLayers,
  };
}
function paintLayoutFromRasterLayer(
  layer: Pick<ILayerConfig, "opacity" | "visibility">,
): Pick<RasterLayerSpecification, "type" | "paint" | "layout"> {
  return {
    type: "raster",
    paint: {
      "raster-opacity": layer.opacity,
    },
    layout: {
      visibility: layer.visibility ? "visible" : "none",
    },
  };
}

export function layerConfigSourceId(layer: Pick<ILayerConfig, "id">) {
  return `placemarkInternalSource:${layer.id}`;
}

export function layerConfigLayerId(layer: Pick<ILayerConfig, "id">) {
  return `placemarkInternalLayer:${layer.id}`;
}

export async function addTileJSONStyle(
  style: StyleSpecification,
  layer: Extract<ILayerConfig, { type: "TILEJSON" }>,
) {
  const sourceId = layerConfigSourceId(layer);
  const layerId = layerConfigLayerId(layer);

  try {
    const resp = await getTileJSON(layer.url);

    style.sources[sourceId] = {
      type: "raster",
      tiles: resp.tiles,
      scheme: resp.scheme || "xyz",
      tileSize: 256,
      minzoom: resp.minzoom,
      maxzoom: resp.maxzoom,
    };

    const newLayer = {
      id: layerId,
      source: sourceId,
      ...paintLayoutFromRasterLayer(layer),
    } as LayerSpecification;

    style.layers.push(newLayer);
  } catch (_e) {
    toast.error(
      "A TileJSON layer failed to load: the server it depends on may be down",
    );
  }
  return style;
}

export function addXYZStyle(
  style: StyleSpecification,
  layer: Extract<ILayerConfig, { type: "XYZ" }>,
) {
  const sourceId = layerConfigSourceId(layer);
  const layerId = layerConfigLayerId(layer);

  style.sources[sourceId] = {
    type: "raster",
    tiles: [layer.url],
    scheme: layer.tms ? "tms" : "xyz",
    tileSize: 256,
  };

  const newLayer = {
    id: layerId,
    source: sourceId,
    ...paintLayoutFromRasterLayer(layer),
  } as LayerSpecification;

  style.layers.push(newLayer);

  return style;
}
