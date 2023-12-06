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
    url: "mapbox://styles/tmcw/ckkpwot3j10mt17p1y4ecfvgx",
    ...defaults,
  },
  DARK: {
    name: "Dark",
    url: "mapbox://styles/tmcw/ckmqwyw951j4f17o060z2lib2",
    ...defaults,
  },
  SATELLITE: {
    name: "Satellite",
    url: "mapbox://styles/tmcw/cklbji3wp19p817mzw4u0lexg",
    ...defaults,
  },
  STREETS: {
    name: "Streets",
    url: "mapbox://styles/tmcw/cklbkf8a317t217rzwz97r2n6",
    ...defaults,
  },
};

export const DEFAULT_LAYER = LAYERS.MONOCHROME;

export default LAYERS;
