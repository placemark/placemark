import { env } from "app/lib/env_client";
import type { DefaultLayer, LayerConfig } from "@prisma/client";

const defaults = {
  type: "MAPBOX",
  token: env.NEXT_PUBLIC_MAPBOX_TOKEN,
} as const;

export type LayerConfigTemplate = Pick<
  LayerConfig,
  "name" | "url" | "type" | "token"
>;

const LAYERS: Record<DefaultLayer, LayerConfigTemplate> = {
  MONOCHROME: {
    name: "Monochrome",
    url: "mapbox://styles/mapbox/light-v10",
    ...defaults,
  },
  DARK: {
    name: "Dark",
    url: "mapbox://styles/mapbox/dark-v10",
    ...defaults,
  },
  SATELLITE: {
    name: "Satellite",
    url: "mapbox://styles/mapbox/satellite-streets-v11",
    ...defaults,
  },
  STREETS: {
    name: "Streets",
    url: "mapbox://styles/mapbox/navigation-guidance-day-v4",
    ...defaults,
  },
};

export const DEFAULT_LAYER = LAYERS.MONOCHROME;

export default LAYERS;
