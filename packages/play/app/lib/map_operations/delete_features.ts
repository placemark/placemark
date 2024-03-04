import type { Feature, FeatureMap, FolderMap } from "types";
import { idToJSONPointers } from "app/lib/id";
import { removeDegenerates } from "app/lib/geometry";
import type { Operation } from "fast-json-patch";
import { applyPatch } from "fast-json-patch";
import { USelection } from "state/index";
import type { Data, Sel, SelFolder, SelMulti, SelSingle } from "state/jotai";
import cloneDeep from "lodash/cloneDeep";
import * as jsonpointer from "app/lib/pointer";
import { EMPTY_MOMENT, Moment } from "app/lib/persistence/moment";
import { getFoldersInTree } from "app/lib/folder";

interface DeleteResult {
  newSelection: Sel;
  moment: Moment;
}

export function removeCoordinatesVertex(
  id: VertexId,
  feature: Feature
): Feature | null {
  const [pointer] = idToJSONPointers(id, feature);
  feature = jsonpointer.clone(feature, pointer);
  const patch: Operation = {
    op: "remove",
    path: pointer,
  };
  applyPatch(feature, [patch]);
  if (feature.geometry === null) return null;
  const geom = removeDegenerates(feature.geometry);
  return geom
    ? {
        ...feature,
        geometry: geom,
      }
    : null;
}

/**
 * This is necessary because if we're deleting vertexes
 * from something, deleting a vertex changes
 * the indexes of all the vertexes 'behind' it.
 */
function sortParts(parts: readonly VertexId[]): VertexId[] {
  return parts.slice().sort((a, b) => b.vertex - a.vertex);
}

function deleteFolder(
  selection: SelFolder,
  featureMap: FeatureMap,
  folderMap: FolderMap
): DeleteResult {
  const folderId = selection.id;

  const toDelete = getFoldersInTree(folderMap, folderId);
  const deleteFeatures: Moment["deleteFeatures"] = [];
  for (const feature of featureMap.values()) {
    if (feature.folderId && toDelete.has(feature.folderId)) {
      deleteFeatures.push(feature.id);
    }
  }

  return {
    newSelection: USelection.none(),
    moment: {
      ...EMPTY_MOMENT,
      note: "Deleted a folder of features",
      deleteFolders: [...toDelete],
      deleteFeatures,
    },
  };
}

function deleteSingleAndMulti(
  selection: SelSingle | SelMulti,
  featureMap: FeatureMap
): DeleteResult {
  // Delete vertexes in a feature
  if (selection.type === "single" && selection.parts.length) {
    const wrappedFeature = featureMap.get(selection.id);
    if (!wrappedFeature) {
      return {
        newSelection: USelection.none(),
        moment: EMPTY_MOMENT,
      };
    }
    let feature: Feature | null = cloneDeep(wrappedFeature.feature);
    const sortedParts = sortParts(selection.parts);
    for (const id of sortedParts) {
      feature = removeCoordinatesVertex(id, feature);
      if (feature === null) {
        return {
          newSelection: USelection.none(),
          moment: {
            ...EMPTY_MOMENT,
            note: "Deleted a feature",
            deleteFeatures: [selection.id],
          },
        };
      }
    }
    return {
      newSelection: USelection.single(selection.id),
      moment: {
        ...EMPTY_MOMENT,
        note: "Deleted features",
        putFeatures: [
          {
            ...wrappedFeature,
            feature,
          },
        ],
      },
    };
  }

  // Delete nothing
  const ids = USelection.toIds(selection);
  if (ids.length === 0) {
    return {
      newSelection: USelection.none(),
      moment: EMPTY_MOMENT,
    };
  }

  // Delete features
  return {
    newSelection: USelection.none(),
    moment: {
      ...EMPTY_MOMENT,
      note: "Deleted features",
      deleteFeatures: ids.slice(),
    },
  };
}

/**
 * Delete any number (including 0) of features
 */
export function deleteFeatures({
  featureMap,
  selection,
  folderMap,
}: Data): DeleteResult {
  switch (selection.type) {
    case "folder": {
      return deleteFolder(selection, featureMap, folderMap);
    }
    case "none": {
      // No-op if nothing is selected: just
      // return another "none" selection and an empty moment.
      return {
        newSelection: USelection.none(),
        moment: EMPTY_MOMENT,
      };
    }
    case "multi":
    case "single": {
      return deleteSingleAndMulti(selection, featureMap);
    }
  }
}
