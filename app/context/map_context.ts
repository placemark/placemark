import { createContext } from "react";
import type PMap from "app/lib/pmap";

export const MapContext = createContext<PMap | null>(null);
