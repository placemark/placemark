import { leaflet } from "app/lib/leaflet_export";
import {
  asColorExpression,
  CIRCLE_PAINT,
  FILL_PAINT,
  LINE_PAINT,
} from "app/lib/load_and_augment_style";
import type { ISymbolization } from "types";

export interface EOption {
  name: string;
  value: string;
}

export function exportStyle(symbolization: ISymbolization): EOption[] {
  return [
    {
      name: "MapLibre Style: Line",
      value: JSON.stringify(LINE_PAINT(symbolization, true), null, 2),
    },
    {
      name: "MapLibre Style: Fill",
      value: JSON.stringify(FILL_PAINT(symbolization, true), null, 2),
    },
    {
      name: "MapLibre Style: Circle",
      value: JSON.stringify(CIRCLE_PAINT(symbolization, false), null, 2),
    },
    {
      name: "MapLibre Expression",
      value: JSON.stringify(
        asColorExpression({
          symbolization: {
            ...symbolization,
            simplestyle: false,
          },
        }),
        null,
        2,
      ),
    },
    {
      name: "Leaflet",
      value: leaflet(symbolization),
    },
  ];
}
