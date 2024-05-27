import { DEFAULT_MAP_BOUNDS } from "app/lib/constants";

export const DEFAULT_MAP_CENTER: Pos2 = [
  (DEFAULT_MAP_BOUNDS[0][0] + DEFAULT_MAP_BOUNDS[1][0]) / 2,
  (DEFAULT_MAP_BOUNDS[0][1] + DEFAULT_MAP_BOUNDS[1][1]) / 2,
];

/**
 * Selection utilities
 */
export { USelection } from "./uselection";

export type { ModeOptions, ModeWithOptions } from "state/mode";
