import { atomWithReset } from "jotai/utils";
import type { ConvertResult } from "app/lib/convert/utils";
import type { FileGroups } from "app/lib/group_files";
import type { SimplifySupportedGeometry } from "app/lib/map_operations/simplify";
import type { IFeature, IWrappedFeature } from "types";

/**
 * Modal state, controlled by dragging and dropping,
 * keybindings, etc.
 */
export type DialogStateImport = {
  type: "import";
  files: FileGroups;
};

export type DialogStateExportSVG = {
  type: "export-svg";
};

export type DialogStateCircle = {
  type: "circle";
  position: Pos2;
};

export type DialogStateExamples = {
  type: "import_example";
};

export type DialogStateImportNotes = {
  type: "import_notes";
  result: ConvertResult;
};

export type DialogStateExportCode = {
  type: "export_code";
};

export type DialogStateCastProperty = {
  type: "cast_property";
  column: string;
};

export type DialogStateBuffer = {
  type: "buffer";
  features: IWrappedFeature[];
};

export type DialogStateSimplify = {
  type: "simplify";
  features: IWrappedFeature<IFeature<SimplifySupportedGeometry>>[];
};

export type DialogStateLoadText = {
  type: "load_text";
  initialValue?: string;
};

export type DialogState =
  | DialogStateImport
  | DialogStateImportNotes
  | DialogStateCastProperty
  | DialogStateSimplify
  | DialogStateBuffer
  | DialogStateCircle
  | DialogStateExamples
  | DialogStateExportCode
  | {
      type: "circle_types";
    }
  | {
      type: "quickswitcher";
    }
  | {
      type: "cheatsheet";
    }
  | {
      type: "export";
    }
  | {
      type: "export-svg";
    }
  | DialogStateLoadText
  | {
      type: "from_url";
    }
  | null;

export const dialogAtom = atomWithReset<DialogState>(null);
