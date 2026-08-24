import { env } from "app/lib/env_client";
import type { ILayerConfig } from "types";

const mapboxDefaults = {
  type: "MAPBOX",
  token: env.MAPBOX_TOKEN,
} as const;

export type LayerConfigTemplate =
  | Pick<
      Extract<ILayerConfig, { type: "MAPBOX" }>,
      "name" | "url" | "type" | "token"
    >
  | Pick<Extract<ILayerConfig, { type: "STYLE" }>, "name" | "url" | "type">;

const LAYERS = {
  POSITRON: {
    name: "Positron (OpenFreeMap)",
    url: "https://tiles.openfreemap.org/styles/positron",
    type: "STYLE",
  },
  MONOCHROME: {
    name: "Monochrome",
    url: "mapbox://styles/mapbox/light-v10",
    ...mapboxDefaults,
  },
  DARK: {
    name: "Dark",
    url: "mapbox://styles/mapbox/dark-v10",
    ...mapboxDefaults,
  },
  SATELLITE: {
    name: "Satellite",
    url: "mapbox://styles/mapbox/satellite-streets-v11",
    ...mapboxDefaults,
  },
  STREETS: {
    name: "Streets",
    url: "mapbox://styles/mapbox/navigation-guidance-day-v4",
    ...mapboxDefaults,
  },
} satisfies Record<string, LayerConfigTemplate>;

export default LAYERS;
