import type {
  LayerSpecification,
  RasterLayerSpecification,
  StyleSpecification,
} from "@maplibre/maplibre-gl-style-spec";
import { getMapboxLayerURL, getTileJSON } from "app/lib/utils";
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

export async function addMapboxStyle(
  _base: StyleSpecification,
  layer: Extract<ILayerConfig, { type: "MAPBOX" }>,
): Promise<StyleSpecification> {
  const url = getMapboxLayerURL(layer);
  const style = await fetchStyle(url);

  const updatedStyle = updateMapboxStyle(
    makeMapboxStyleMapLibreCompatible(style, layer.token),
    {
      labelVisibility: layer.labelVisibility,
      rasterOpacity: layer.opacity,
      visibility: layer.visibility,
    },
  );
  return updatedStyle;
}

export async function addMapLibreStyle(
  _base: StyleSpecification,
  layer: Extract<ILayerConfig, { type: "STYLE" }>,
): Promise<StyleSpecification> {
  const style = await fetchStyle(layer.url);
  return updateMapboxStyle(style, {
    labelVisibility: layer.labelVisibility,
    rasterOpacity: layer.opacity,
    visibility: layer.visibility,
  });
}

function mapboxResourceURL(url: string, token: string): string {
  const accessToken = `access_token=${encodeURIComponent(token)}`;

  if (url.startsWith("mapbox://sprites/")) {
    const path = url.slice("mapbox://sprites/".length);
    return `https://api.mapbox.com/styles/v1/${path}/sprite?${accessToken}`;
  }

  if (url.startsWith("mapbox://fonts/")) {
    const path = url.slice("mapbox://fonts/".length);
    return `https://api.mapbox.com/fonts/v1/${path}?${accessToken}`;
  }

  if (url.startsWith("mapbox://")) {
    const path = url.slice("mapbox://".length);
    return `https://api.mapbox.com/v4/${path}.json?secure&${accessToken}`;
  }

  return url;
}

export function makeMapboxStyleMapLibreCompatible(
  style: StyleSpecification,
  token: string,
): StyleSpecification {
  return {
    ...style,
    sprite:
      typeof style.sprite === "string"
        ? mapboxResourceURL(style.sprite, token)
        : style.sprite,
    glyphs:
      typeof style.glyphs === "string"
        ? mapboxResourceURL(style.glyphs, token)
        : style.glyphs,
    sources: Object.fromEntries(
      Object.entries(style.sources).map(([id, source]) => [
        id,
        "url" in source && typeof source.url === "string"
          ? { ...source, url: mapboxResourceURL(source.url, token) }
          : source,
      ]),
    ) as StyleSpecification["sources"],
  };
}

function updateMapboxStyle(
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

  const isSatelliteStyle =
    style.name === "Mapbox Satellite Streets" ||
    style.name === "Mapbox Satellite";

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

      if (
        isSatelliteStyle &&
        layer.type === "raster" &&
        rasterOpacity !== undefined
      ) {
        return {
          ...layer,
          paint: {
            ...(layer.paint || {}),
            "raster-opacity": rasterOpacity,
          },
        };
      }

      if (isSatelliteStyle && layer.type === "background" && layer.paint) {
        return {
          ...layer,
          paint: {
            ...layer.paint,
            "background-color": "#ffffff",
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
  layer: ILayerConfig,
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

export async function addTileJSONStyle(
  style: StyleSpecification,
  layer: ILayerConfig,
  id: number,
) {
  const sourceId = `placemarkInternalSource${id}`;
  const layerId = `placemarkInternalLayer${id}`;

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
  layer: ILayerConfig,
  id: number,
) {
  const sourceId = `placemarkInternalSource${id}`;
  const layerId = `placemarkInternalLayer${id}`;

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
