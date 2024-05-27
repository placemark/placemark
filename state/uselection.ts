import type { Data, Sel, SelFolder, SelSingle } from "state/jotai";
import type { IFolder, IWrappedFeature } from "types";
import { toggle } from "app/lib/utils";
import { EMPTY_ARRAY } from "app/lib/constants";
import { getFoldersInTree } from "app/lib/folder";

export const USelection = {
  /**
   * Used when we transition from a "something is selected" mode to a
   * drawing mode. This preserves the parent folder selection so that
   * we can place a feature in that.
   */
  selectionToFolder(
    data: Pick<Data, "selection" | "featureMap" | "folderMap">
  ): Sel {
    const { selection } = data;

    switch (selection.type) {
      case "none":
        return SELECTION_NONE;
      case "folder":
        return selection;
      case "multi":
      case "single": {
        const wrappedFeature = USelection.getSelectedFeatures(data)[0];

        return wrappedFeature?.folderId
          ? USelection.folder(wrappedFeature.folderId)
          : SELECTION_NONE;
      }
    }
  },
  reduce(selection: Sel): Sel {
    return selection.type === "single" && selection.parts.length
      ? USelection.single(selection.id)
      : USelection.none();
  },
  /**
   * Return **Feature** ids associated with this selection.
   * Folder selections return an empty list.
   */
  toIds(selection: Sel): readonly IWrappedFeature["id"][] {
    switch (selection.type) {
      case "none":
      case "folder":
        return [];
      case "single":
        return [selection.id];
      case "multi":
        return selection.ids;
    }
  },
  /**
   * Get vertices as an array if they are in the selection.
   */

  getVertexIds(selection: Sel): VertexId[] {
    if (selection.type === "single" && selection.parts.length) {
      return selection.parts.flatMap((id) => {
        return id.type === "vertex" ? [id] : [];
      });
    }
    return EMPTY_ARRAY as VertexId[];
  },

  // Dangerous: this will throw if given a 'none' selection.
  // Basically an assertion method.
  asSingle(selection: Sel): SelSingle {
    if (selection.type === "none" || selection.type === "folder") {
      throw new Error("Given a none selection");
    }
    return selection.type === "single"
      ? selection
      : {
          type: "single",
          id: selection.ids[0],
          parts: [],
        };
  },
  fromIds(ids: IWrappedFeature["id"][]): Sel {
    return ids.length === 0
      ? { type: "none" }
      : ids.length === 1
      ? this.single(ids[0])
      : {
          type: "multi",
          ids,
        };
  },
  /**
   * Get selected features of a single or multi selection.
   */
  getSelectedFeatures({
    selection,
    featureMap,
    folderMap,
  }: Pick<Data, "selection" | "featureMap" | "folderMap">): IWrappedFeature[] {
    switch (selection.type) {
      case "none": {
        return EMPTY_ARRAY as IWrappedFeature[];
      }
      case "folder": {
        const folders = getFoldersInTree(folderMap, selection.id);
        const features: IWrappedFeature[] = [];
        for (const feature of featureMap.values()) {
          if (feature.folderId && folders.has(feature.folderId)) {
            features.push(feature);
          }
        }
        return features;
      }
      default: {
        const features: IWrappedFeature[] = [];
        for (const id of this.toIds(selection)) {
          const feature = featureMap.get(id);
          if (feature) features.push(feature);
        }
        return features;
      }
    }
  },
  isSelected(selection: Sel, id: IWrappedFeature["id"]): boolean {
    switch (selection.type) {
      case "none":
      case "folder": {
        return false;
      }
      case "single": {
        return selection.id === id;
      }
      case "multi": {
        return selection.ids.includes(id);
      }
    }
  },
  isFolderSelected(selection: Sel, id: IFolder["id"]): boolean {
    return selection.type === "folder" && selection.id === id;
  },
  isVertexSelected(selection: Sel, id: string, vertexId: VertexId): boolean {
    return (
      selection.type === "single" &&
      selection.id === id &&
      selection.parts.length === 1 &&
      selection.parts[0].vertex === vertexId.vertex
    );
  },
  /**
   * Note: only deals in top-level uids,
   * not RawId components.
   */
  toggleSelectionId(selection: Sel, id: IWrappedFeature["id"]): Sel {
    const ids = this.toIds(selection);
    const updatedIds = toggle(ids, id);
    return this.fromIds(updatedIds);
  },
  toggleSingleSelectionId(selection: Sel, id: IWrappedFeature["id"]): Sel {
    if (selection.type === "single" && this.isSelected(selection, id)) {
      return this.none();
    }
    return this.single(id);
  },
  addSelectionId(selection: Sel, id: IWrappedFeature["id"]): Sel {
    const ids = this.toIds(selection);
    if (ids.includes(id)) return selection;
    return this.fromIds(ids.concat(id));
  },
  removeFeatureFromSelection(selection: Sel, id: IWrappedFeature["id"]): Sel {
    switch (selection.type) {
      case "folder":
      case "none": {
        return selection;
      }
      case "single": {
        if (selection.id === id) {
          return SELECTION_NONE;
        } else {
          return selection;
        }
      }
      case "multi": {
        if (selection.ids.includes(id)) {
          selection.ids = selection.ids.filter((sid) => sid !== id);
          return selection;
        } else {
          return selection;
        }
      }
    }
  },
  none(): Sel {
    return SELECTION_NONE;
  },
  /**
   * Get the folder id from a folder selection,
   * if there is one.
   */
  folderId(selection: Sel): string | null {
    if (selection.type === "folder") {
      return selection.id;
    }
    return null;
  },
  folder(id: IFolder["id"]): SelFolder {
    return {
      type: "folder",
      id,
    };
  },
  single(id: IWrappedFeature["id"]): SelSingle {
    return {
      type: "single",
      id,
      parts: [],
    };
  },
};

export const SELECTION_NONE: Sel = {
  type: "none",
};
