import { arrayMove } from "@dnd-kit/sortable";
import { sortByAt } from "app/lib/parse_stored";
import { useMemo } from "react";
import {
  IFolder,
  Feature,
  IWrappedFeature,
  FeatureMap,
  FolderMap,
} from "types";
import type { Root, Folder as TFolder } from "@tmcw/togeojson";
import { collectFoldersByFolder } from "app/lib/folder";
import { Data, SelSingle } from "state/jotai";
import { UniqueIdentifier } from "@dnd-kit/core";

export const indentationWidth = 16;

export interface FlattenedFolder {
  kind: "folder";
  at: string;
  id: string;
  data: IFolder;
  depth: number;
}

export interface FlattenedFeature {
  kind: "feature";
  at: string;
  data: IWrappedFeature;
  id: string;
  depth: number;
}

interface Sortable {
  at: string;
  id: string;
  data: Feature | TFolder;
}

export type FlattenedItem = FlattenedFolder | FlattenedFeature;

function folderToFlat(folder: IFolder, depth: number): FlattenedFolder {
  return {
    at: folder.at,
    id: folder.id,
    kind: "folder",
    depth,
    data: folder,
  };
}

function featureToFlat(
  feature: IWrappedFeature,
  depth: number
): FlattenedFeature {
  return {
    at: feature.at,
    id: feature.id,
    kind: "feature",
    depth,
    data: feature,
  };
}

/**
 * Index a list of features by their parent folder.
 */
function collectFeaturesByFolder(featureMap: FeatureMap) {
  const featuresByFolder = new Map<string | null, IWrappedFeature[]>();
  for (const feature of featureMap.values()) {
    const group = featuresByFolder.get(feature.folderId) || [];
    group.push(feature);
    featuresByFolder.set(feature.folderId, group);
  }
  return featuresByFolder;
}

export function solveRootItems(
  featureMap: FeatureMap,
  folderMap: FolderMap
): Root {
  const featuresByFolder = collectFeaturesByFolder(featureMap);
  const foldersByFolder = collectFoldersByFolder(folderMap);

  function getChildren(folderId: string | null): Array<TFolder | Feature> {
    const features = (featuresByFolder.get(folderId) ?? []).map(
      (wrappedFeature): Sortable => {
        return {
          id: wrappedFeature.id,
          at: wrappedFeature.at,
          data: wrappedFeature.feature,
        };
      }
    );
    const folders = (foldersByFolder.get(folderId) ?? []).map(
      (folder): Sortable => {
        const children = getChildren(folder.id);
        const count = children.filter(
          (child) => child.type === "Feature"
        ).length;
        return {
          at: folder.at,
          id: folder.id,
          data: {
            type: "folder",
            meta: {
              id: folder.id,
              count,
              name: folder.name,
            },
            children,
          },
        };
      }
    );

    const items = sortByAt([...features, ...folders]).map((item) => item.data);

    return items;
  }

  return {
    type: "root",
    children: getChildren(null),
  };
}

/**
 * For the left-side UI that shows a draggable list of features,
 * this generates a flattened setup of those features.
 */
export function useRootItems({
  folderMap,
  featureMap,
}: {
  folderMap: FolderMap;
  featureMap: FeatureMap;
}): Root {
  return useMemo(() => {
    return solveRootItems(featureMap, folderMap);
  }, [featureMap, featureMap.version, folderMap, folderMap.version]);
}

/**
 * Only used internally (and recursively)
 * by useFlattenedItems
 */
function getLevel(
  folderId: string | null,
  depth: number,
  featuresByFolder: ReturnType<typeof collectFeaturesByFolder>,
  foldersByFolder: ReturnType<typeof collectFoldersByFolder>,
  activeId: UniqueIdentifier | null
) {
  let items: FlattenedItem[] = [];
  const folders = foldersByFolder.get(folderId) ?? [];
  const features = featuresByFolder.get(folderId) ?? [];

  /**
   * A sort of insane optimization here. Maybe unnecessary,
   * but this is a pretty hot part of the codebase.
   *
   * Basically the features and folders arrays are both sorted,
   * and we want to print out a sorted, combined list. So this
   * iterates through _both_ of them simultaneously, incrementing
   * two loop counters.
   */

  function pushFeature(feature: IWrappedFeature, depth: number) {
    items.push(featureToFlat(feature, depth));
    featureI++;
  }

  function pushFolder(folder: IFolder, depth: number) {
    items.push(folderToFlat(folder, depth));
    folderI++;
  }

  // Indices
  let folderI = 0;
  let featureI = 0;
  while (folderI < folders.length || featureI < features.length) {
    const headFolder = folders[folderI];
    const headFeature = features[featureI];
    // If there's no folder, push the feature
    if (!headFolder) {
      pushFeature(headFeature, depth);
    } else if (!headFeature) {
      pushFolder(headFolder, depth);
    } else if (headFeature.at < headFolder.at) {
      /**
       * Otherwise, if there is both a feature and a folder,
       * push the one with the lower 'at'.
       */
      pushFeature(headFeature, depth);
    } else {
      pushFolder(headFolder, depth);
    }
  }

  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];
    if (item.kind !== "folder") continue;
    const folder = item.data;

    const hideChildren = !folder.expanded || activeId === folder.id;
    if (!hideChildren) {
      const children = getLevel(
        folder.id,
        depth + 1,
        featuresByFolder,
        foldersByFolder,
        activeId
      );
      if (children.length) {
        // This previously used splice. This is sort of just
        // splice via a different mechanism. Slice is slow.
        items = items
          .slice(0, i + 1)
          .concat(children)
          .concat(items.slice(i + 1));
      }
    }
  }
  return items;
}

/**
 * For the left-side UI that shows a draggable list of features,
 * this generates a flattened setup of those features.
 *
 * activeId lets us hide items that are under folders
 * that are being dragged.
 */
export function useFlattenedItems({
  data,
  activeId,
}: {
  data: Data;
  activeId: UniqueIdentifier | null;
}) {
  return useMemo(() => {
    const featuresByFolder = collectFeaturesByFolder(data.featureMap);
    const foldersByFolder = collectFoldersByFolder(data.folderMap);

    return getLevel(null, 0, featuresByFolder, foldersByFolder, activeId);
  }, [data, activeId]);
}

/**
 * Used for selecting which folder to export, this returns a list
 * of folder items, with the count of items in them, as well as an 'All' item.
 * This assumes you've used useRootItems already.
 */
export function useFolderSummary({
  featureMap,
  root,
}: {
  featureMap: FeatureMap;
  root: Root;
}): TFolder[] {
  return useMemo(() => {
    const items: TFolder[] = [
      {
        type: "folder",
        children: Array.from(featureMap.values()).map(
          (wrappedFeature) => wrappedFeature.feature
        ),
        meta: {
          count: featureMap.size,
          id: null,
          name: "All",
        },
      },
    ];

    function flattenChild(child: TFolder | Feature) {
      switch (child.type) {
        case "Feature":
          break;
        case "folder": {
          const features = child.children.filter(
            (child) => child.type === "Feature"
          );
          items.push({
            ...child,
            meta: {
              ...child.meta,
              count: features.length,
            },
            // TODO: wrong
            children: features,
          });
          for (const c of child.children) {
            flattenChild(c);
          }
          break;
        }
      }
    }

    for (const child of root.children) {
      flattenChild(child);
    }

    return items;
  }, [root, featureMap]);
}

/**
 * Round a drag x coordinate to a depth level.
 */
function getDragDepth(offset: number, indentationWidth: number) {
  return Math.round(offset / indentationWidth);
}

/**
 * Derived from dndkit: this method helps figure out where
 * the given feature or folder is going to be dropped.
 */
export function getProjection({
  tree,
  activeId,
  overId,
  offsetLeft,
  indentationWidth,
  dropIntoFolder,
}: {
  tree: FlattenedItem[];
  activeId: UniqueIdentifier;
  overId: UniqueIdentifier;
  offsetLeft: number;
  indentationWidth: number;
  dropIntoFolder: boolean;
}) {
  const overItemIndex = tree.findIndex(({ id }) => id === overId);
  const activeItemIndex = tree.findIndex(({ id }) => id === activeId);

  const activeItem = tree[activeItemIndex];

  const newItems = arrayMove(tree, activeItemIndex, overItemIndex);
  const previousItem = newItems[overItemIndex - 1];
  const nextItem = newItems[overItemIndex + 1];

  const dragDepth = getDragDepth(offsetLeft, indentationWidth);
  const projectedDepth = activeItem.depth + dragDepth;
  const maxDepth = getMaxDepth({
    previousItem,
  });
  const minDepth = getMinDepth({ nextItem });
  let depth = projectedDepth;

  if (projectedDepth >= maxDepth) {
    depth = maxDepth;
  } else if (projectedDepth < minDepth) {
    depth = minDepth;
  }

  function getParentId(): string | null {
    if (depth === 0 || !previousItem) {
      return null;
    }

    if (depth === previousItem.depth) {
      return previousItem.data.folderId;
    }

    if (depth > previousItem.depth) {
      return previousItem.id;
    }

    const newParent = newItems
      .slice(0, overItemIndex)
      .reverse()
      .find((item) => item.depth === depth)?.data.folderId;

    return newParent ?? null;
  }

  if (dropIntoFolder) {
    return {
      depth,
      maxDepth,
      minDepth,
      folderId: String(overId),
    };
  }

  return {
    depth,
    maxDepth,
    minDepth,
    folderId: getParentId(),
  };
}

function getMaxDepth({ previousItem }: { previousItem: FlattenedItem }) {
  if (previousItem?.kind === "folder") {
    return previousItem.depth + 1;
  }

  if (previousItem?.kind === "feature") {
    return previousItem.depth;
  }

  return 0;
}

function getMinDepth({ nextItem }: { nextItem: FlattenedItem }) {
  if (nextItem) {
    return nextItem.depth;
  }

  return 0;
}

type Expansions = IFolder[];

/**
 * Given a selection for a single feature, figure
 * out whether it'll be visible in a folder tree,
 * and return a list of any folders that need for it to be
 * expanded in order to be visible.
 *
 * If the feature's at the root or all of its containing
 * folders are expanded, the list is empty. If any of
 * the folders the feature is in are closed, returns
 * them in the list.
 *
 * This is for when someone clicks on a feature on the map,
 * and we want it to be visible in the left panel.
 */
export function getRequiredExpansionsFeature(
  selection: SelSingle,
  data: Data
): Expansions {
  const expansions: Expansions = [];
  const feature = data.featureMap.get(selection.id);
  if (!feature) return expansions;

  let folderId = feature.folderId;

  while (folderId !== null) {
    // Features at the root are visible.
    const folder = data.folderMap.get(folderId);
    if (!folder) return expansions;

    if (!folder.expanded) {
      expansions.push(folder);
    }

    folderId = folder.folderId;
  }

  return expansions;
}
