import { FeatureMap, FolderMap, IFolder, IWrappedFeature } from "types";

type FolderByFolderMap = Map<string | null, IFolder[]>;

/**
 * Recursively add any folders that are
 * under `folderId` to the `exclude` set, using
 * idMap.
 */
export function collectDescendents(
  folderId: string,
  idMap: FolderByFolderMap,
  exclude: Set<string>
) {
  for (const child of idMap.get(folderId) ?? []) {
    exclude.add(child.id);
    collectDescendents(child.id, idMap, exclude);
  }
  return exclude;
}

/**
 * Generate an exclude list: given a list of folders,
 * return a set of ids of all the folders that are set to
 * visibility=false, as well as their children.
 */
export function generateExclude(folderMap: FolderMap): Set<string> {
  const idMap = collectFoldersByFolder(folderMap);
  const exclude = new Set<string>();
  for (const folder of folderMap.values()) {
    if (folder.visibility === false) {
      exclude.add(folder.id);
      collectDescendents(folder.id, idMap, exclude);
    }
  }
  return exclude;
}

/**
 * Index a list of folders by their parent folder.
 */
export const collectFoldersByFolder = (folderMap: FolderMap) => {
  const foldersByFolder = new Map<string | null, IFolder[]>();
  for (const folder of folderMap.values()) {
    const group = foldersByFolder.get(folder.folderId) || [];
    group.push(folder);
    foldersByFolder.set(folder.folderId, group);
  }
  return foldersByFolder;
};

/**
 * Generate an exclude list: given a list of folders,
 * return a set of ids of all the folders that are set to
 * visibility=false, as well as their children.
 */
export const generateLockedSet = (folderMap: FolderMap): Set<string> => {
  const idMap = collectFoldersByFolder(folderMap);
  const exclude = new Set<string>();
  for (const folder of folderMap.values()) {
    if (folder.locked) {
      exclude.add(folder.id);
      collectDescendents(folder.id, idMap, exclude);
    }
  }
  return exclude;
};

/**
 * Collect all the folders in a tree, starting with `folderId`,
 * including the one identified by folderId.
 */
export function getFoldersInTree(
  folderMap: FolderMap,
  folderId: string
): Set<string> {
  const set = new Set<string>([folderId]);
  const idMap = collectFoldersByFolder(folderMap);
  collectDescendents(folderId, idMap, set);
  return set;
}

/**
 * Generate an exclude list: given a list of folders,
 * return a set of ids of all the folders that are set to
 * visibility=false, as well as their children.
 */
export function isFeatureLocked(
  feature: IWrappedFeature,
  folderMap: FolderMap
): boolean {
  if (!feature.folderId) return false;

  let parentFolder = folderMap.get(feature.folderId);

  while (parentFolder) {
    if (parentFolder.locked) return true;
    if (!parentFolder.folderId) return false;
    parentFolder = folderMap.get(parentFolder.folderId);
  }

  return false;
}

export function filterLockedFeatures({
  featureMap,
  folderMap,
}: {
  featureMap: FeatureMap;
  folderMap: FolderMap;
}) {
  const lockedSet = generateLockedSet(folderMap);
  const exclude = generateExclude(folderMap);

  const features: IWrappedFeature[] = [];
  for (const feature of featureMap.values()) {
    if (feature.feature.properties?.visibility === false) {
      continue;
    }
    if (
      !feature.folderId ||
      (!exclude.has(feature.folderId) && !lockedSet.has(feature.folderId))
    ) {
      features.push(feature);
    }
  }

  return features;
}
