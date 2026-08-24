import type { ILayerConfig } from "types";

export type LayerConfigTemplate = Pick<
  Extract<ILayerConfig, { type: "STYLE" }>,
  "name" | "url" | "type"
>;

const LAYERS = {
  POSITRON: {
    name: "Positron (OpenFreeMap)",
    url: "https://tiles.openfreemap.org/styles/positron",
    type: "STYLE",
  },
  BRIGHT: {
    name: "Bright (OpenFreeMap)",
    url: "https://tiles.openfreemap.org/styles/bright",
    type: "STYLE",
  },
  LIBERTY: {
    name: "Liberty (OpenFreeMap)",
    url: "https://tiles.openfreemap.org/styles/liberty",
    type: "STYLE",
  },
  DARK: {
    name: "Dark (OpenFreeMap)",
    url: "https://tiles.openfreemap.org/styles/dark",
    type: "STYLE",
  },
  FIORD: {
    name: "Fiord (OpenFreeMap)",
    url: "https://tiles.openfreemap.org/styles/fiord",
    type: "STYLE",
  },
} satisfies Record<string, LayerConfigTemplate>;

export default LAYERS;
