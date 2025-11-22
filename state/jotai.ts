import type { ScaleUnit } from "app/lib/constants";
import type { ExportOptions } from "app/lib/convert";
import LAYERS from "app/lib/default_layers";
import type { QItemAddable } from "app/lib/geocode";
import type { PersistenceMetadataMemory } from "app/lib/persistence/ipersistence";
import type { MomentLog } from "app/lib/persistence/moment";
import { CMomentLog } from "app/lib/persistence/moment";
import { shallowArrayEqual } from "app/lib/utils";
import type { FileSystemHandle } from "browser-fs-access";
import { atom, type createStore } from "jotai";
import { atomWithStorage, selectAtom } from "jotai/utils";
import { focusAtom } from "jotai-optics";
import { atomWithMachine } from "jotai-xstate";
import { CIRCLE_TYPE, MODE_INFO, Mode, ROUTE_TYPE, modeAtom } from "state/mode";
import type { SetOptional } from "type-fest";
import {
  type FeatureMap,
  type FolderMap,
  type IFolder,
  type LayerConfigMap,
  SYMBOLIZATION_NONE,
} from "types";
import { NIL } from "uuid";
import { createMachine } from "xstate";
import { USelection } from "./uselection";

export type Store = ReturnType<typeof createStore>;

// TODO: make this specific
type MapboxLayer = any;

interface FileInfo {
  handle: FileSystemHandle | FileSystemFileHandle;
  options: ExportOptions;
}

export type PreviewProperty = PersistenceMetadataMemory["label"];

// ----------------------------------------------------------------------------

/**
 * Core data
 */
export interface Data {
  folderMap: FolderMap;
  featureMap: FeatureMap;
  selection: Sel;
}

/**
 * Derived list of folders
 */
export const dataAtom = atom<Data>({
  featureMap: new Map(),
  folderMap: new Map(),
  selection: {
    type: "none",
  },
});

const layerId = NIL;

export const layerConfigAtom = atom<LayerConfigMap>(
  new Map([
    [
      layerId,
      {
        ...LAYERS.MONOCHROME,
        at: "a0",
        opacity: 1,
        tms: false,
        visibility: true,
        labelVisibility: true,
        id: layerId,
      },
    ],
  ]),
);

export const selectedFeaturesAtom = selectAtom(
  dataAtom,
  (data) => {
    return USelection.getSelectedFeatures(data);
  },
  shallowArrayEqual,
);

export const selectionAtom = focusAtom(dataAtom, (optic) =>
  optic.prop("selection"),
);


export const memoryMetaAtom = atom<Omit<PersistenceMetadataMemory, "type">>({
  symbolization: SYMBOLIZATION_NONE,
  label: null,
  layer: null,
});

export const searchHistoryAtom = atom<string[]>([]);

// ----------------------------------------------------------------------------
/**
 * Split
 */
export type Side = "left" | "right";

export const OTHER_SIDE: Record<Side, Side> = {
  left: "right",
  right: "left",
};

/**
 * The separation between the map and the pane, which can
 * be controlled by dragging the resizer
 */
export const MIN_SPLITS = {
  left: 100,
  right: 200,
} as const;

export interface Splits {
  layout: PanelLayout;
  bottom: number;
  rightOpen: boolean;
  right: number;
  leftOpen: boolean;
  left: number;
}

type PanelLayout = "AUTO" | "FLOATING" | "VERTICAL";

export const splitsAtom = atom<Splits>({
  layout: "AUTO",
  bottom: 500,
  rightOpen: true,
  right: 320,
  leftOpen: true,
  left: 200,
});

export const showPanelBottomAtom = atom<boolean>(true);

// ----------------------------------------------------------------------------
export const showAllAtom = atomWithStorage("showAll", true);
export const panelIdOpen = atomWithStorage("panelIdOpen", false);
export const panelRawOpen = atomWithStorage("panelRawOpen", false);
export const panelExportOpen = atomWithStorage("panelExportOpen", false);
export const panelNullOpen = atomWithStorage("panelNullOpen", true);
export const panelCircleOpen = atomWithStorage("panelCircleOpen", true);
export const panelStyleOpen = atomWithStorage("panelStyleOpen", false);
export const panelSymbolizationExportOpen = atomWithStorage(
  "panelSymbolizationExportOpen",
  true,
);
export type PanelAtom = typeof panelIdOpen;

export const hideHintsAtom = atomWithStorage<Mode[]>("hideHints", []);

export const scaleUnitAtom = atomWithStorage<ScaleUnit>(
  "scaleUnit",
  "imperial",
);

export const addMetadataWithGeocoderAtom = atomWithStorage(
  "addMetadataWithGeocoder",
  false,
);

export type {
  DialogStateCastProperty as ModalStateCastProperty,
  DialogStateImport as ModalStateImport,
} from "state/dialog_state";
// ----------------------------------------------------------------------------
/**
 * Modal state
 */
export { dialogAtom } from "state/dialog_state";

/**
 * Current layer state
 * TODO: move to server
 */
export type PartialLayer = SetOptional<MapboxLayer, "createdById">;

/**
 * Moment log state. This is the client-side representation
 * of undo/redo history, which is only relevant to the user
 * editing this document.
 */
export const momentLogAtom = atom<MomentLog>(new CMomentLog());

// ----------------------------------------------------------------------------
/**
 * Selection state
 */

/**
 * A selection of a single folder.
 */
export interface SelFolder {
  type: "folder";
  /**
   * The folder's id
   */
  id: StringId;
}

/**
 * A selection of a single feature.
 */
export interface SelSingle {
  type: "single";
  /**
   * The feature's id
   */
  id: StringId;
  parts: readonly VertexId[];
}

export interface SelMulti {
  type: "multi";
  ids: readonly StringId[];
  previousIds?: readonly StringId[];
}

/**
 * This is not an abbreviation, it is named Sel
 * instead of Selection for safety: otherwise
 * window.Selection will sneak in if you don't
 * import the type.
 */
export type Sel =
  | SelMulti
  | SelFolder
  | {
      type: "none";
    }
  | SelSingle;

export const SELECTION_NONE: Sel = {
  type: "none",
};

// ----------------------------------------------------------------------------
/**
 * Ephemeral editing state
 */
export interface EphemeralEditingStateLasso {
  type: "lasso";
  box: [Pos2, Pos2];
}

export const cursorStyleAtom = atom<React.CSSProperties["cursor"]>("default");

export type EphemeralEditingState =
  | EphemeralEditingStateLasso
  | { type: "none" };

export const ephemeralStateAtom = atom<EphemeralEditingState>({ type: "none" });

export { Mode, MODE_INFO, modeAtom };

export const lastSearchResultAtom = atom<QItemAddable | null>(null);

/**
 * File info
 */
export const fileInfoAtom = atom<FileInfo | null>(null);

const fileInfoMachine = createMachine({
  predictableActionArguments: true,
  id: "fileInfo",
  initial: "idle",
  states: {
    idle: {
      on: {
        show: "visible",
      },
    },
    visible: {
      after: {
        2000: {
          target: "idle",
        },
      },
    },
  },
});

export const fileInfoMachineAtom = atomWithMachine(() => fileInfoMachine);

export enum TabOption {
  Feature = "Feature",
  Table = "Table",
  List = "List",
  Symbolization = "Symbolization",
}

export const tabAtom = atom<TabOption>(TabOption.Feature);

export type VirtualColumns = string[];
export const virtualColumnsAtom = atom<VirtualColumns>([]);

export interface FilterOptions {
  column: string | null;
  search: string | null;
  isCaseSensitive: boolean;
  geometryType: string | null;
  folderId: IFolder["id"] | null;
  exact: boolean;
}

export const initialFilterValues: FilterOptions = {
  column: "",
  search: "",
  isCaseSensitive: false,
  geometryType: null,
  folderId: null,
  exact: false,
};

export const tableFilterAtom = atom<FilterOptions>(initialFilterValues);

export const circleTypeAtom = atomWithStorage<CIRCLE_TYPE>(
  "circleType",
  CIRCLE_TYPE.MERCATOR,
);

export const routeTypeAtom = atomWithStorage<ROUTE_TYPE>(
  "routeType",
  ROUTE_TYPE.WALKING,
);
