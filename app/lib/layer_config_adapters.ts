import { ILayerConfig } from "types";
import { getMapboxLayerURL, getTileJSON } from "app/lib/utils";
import mapboxgl from "mapbox-gl";
import { toast } from "react-hot-toast";
import once from "lodash/once";

const warnOffline = once(() => {
  toast.error("Offline: falling back to blank background");
});

export async function addMapboxStyle(
  _base: mapboxgl.Style,
  layer: ILayerConfig
): Promise<mapboxgl.Style> {
  const nextToken = layer.token;
  mapboxgl.accessToken = nextToken;

  const url = getMapboxLayerURL(layer);

  const style: mapboxgl.Style = await fetch(url)
    .then((res) => {
      if (!res?.ok) {
        throw new Error("Could not fetch layer");
      }
      return res.json();
    })
    .catch(() => {
      warnOffline();
      return {
        version: 8,
        name: "Empty",
        sprite: "mapbox://sprites/mapbox/streets-v8",
        glyphs: "mapbox://fonts/mapbox/{fontstack}/{range}.pbf",
        sources: {},
        layers: [],
      };
    });

  const updatedStyle = applySatelliteStyleModifications(style, layer.opacity);
  return updatedStyle;
}

function applySatelliteStyleModifications(
  style: mapboxgl.Style,
  rasterOpacity: number
): mapboxgl.Style {
  if (style.name !== "Mapbox Satellite Streets") {
    return style;
  }

  const updatedLayers = style.layers.map((layer) => {
    if (layer.type === "raster") {
      return {
        ...layer,
        paint: {
          ...(layer.paint || {}),
          "raster-opacity": rasterOpacity,
        },
      };
    }
    if (layer.type === "background" && layer.paint) {
      return {
        ...layer,
        paint: {
          ...layer.paint,
          "background-color": "#ffffff",
        },
      };
    }
    return layer;
  });

  return {
    ...style,
    layers: updatedLayers,
  };
}

export function paintLayoutFromRasterLayer(
  layer: ILayerConfig
): Pick<mapboxgl.RasterLayer, "type" | "paint" | "layout"> {
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
  style: mapboxgl.Style,
  layer: ILayerConfig,
  id: number
) {
  // mapboxgl.accessToken = env.NEXT_PUBLIC_MAPBOX_TOKEN;

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
    } as mapboxgl.AnyLayer;

    style.layers.push(newLayer);
  } catch (e) {
    toast.error(
      "A TileJSON layer failed to load: the server it depends on may be down"
    );
  }
  return style;
}

export function addXYZStyle(
  style: mapboxgl.Style,
  layer: ILayerConfig,
  id: number
) {
  // mapboxgl.accessToken = env.NEXT_PUBLIC_MAPBOX_TOKEN;

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
  } as mapboxgl.AnyLayer;

  style.layers.push(newLayer);

  return style;
}