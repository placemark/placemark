import { env } from "app/lib/env_client";
import type { ILayerConfig } from "types";

export type LayerConfigTemplate = Pick<
  Extract<ILayerConfig, { type: "STYLE" }>,
  "name" | "url" | "type" | "provider"
>;

const LAYERS = {
  POSITRON: {
    name: "Positron",
    url: "https://tiles.openfreemap.org/styles/positron",
    provider: "OpenFreeMap",
    type: "STYLE",
  },
  BRIGHT: {
    name: "Bright",
    url: "https://tiles.openfreemap.org/styles/bright",
    provider: "OpenFreeMap",
    type: "STYLE",
  },
  LIBERTY: {
    name: "Liberty",
    url: "https://tiles.openfreemap.org/styles/liberty",
    provider: "OpenFreeMap",
    type: "STYLE",
  },
  DARK: {
    name: "Dark",
    url: "https://tiles.openfreemap.org/styles/dark",
    provider: "OpenFreeMap",
    type: "STYLE",
  },
  FIORD: {
    name: "Fiord",
    url: "https://tiles.openfreemap.org/styles/fiord",
    provider: "OpenFreeMap",
    type: "STYLE",
  },
  ...(env.VITE_PUBLIC_MAPTILER_TOKEN
    ? {
        SATELLITE: {
          name: "Satellite",
          url: `https://api.maptiler.com/maps/hybrid-v4/style.json?key=${env.VITE_PUBLIC_MAPTILER_TOKEN}`,
          provider: "MapTiler",
          type: "STYLE",
        },
      }
    : {}),
} satisfies Record<string, LayerConfigTemplate>;

export default LAYERS;
