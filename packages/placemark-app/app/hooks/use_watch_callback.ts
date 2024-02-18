import { IDMap, UIDMap } from "app/lib/id_mapper";
import { sortAts } from "app/lib/parse_stored";
import { PReplicache } from "app/lib/persistence/replicache";
import * as keys from "app/lib/replicache/keys";
import { useAtomCallback } from "jotai/utils";
import { MutableRefObject, useCallback } from "react";
import { Data, dataAtom, layerConfigAtom, presencesAtom } from "state/jotai";
import { USelection } from "state/uselection";
import { IWrappedFeature, IFolder, IPresence, ILayerConfig } from "types";

type Diff = Parameters<Parameters<PReplicache["experimentalWatch"]>[0]>[0];

export function applyDiff(
  data: Data,
  presences: Map<number, IPresence>,
  wrappedFeatureCollectionId: string,
  change: Diff,
  idMap: React.MutableRefObject<IDMap>,
  userId: number,
  layerConfigMap: Map<string, ILayerConfig>
) {
  let { selection, featureMap, folderMap } = data;
  // featureMap and folderMap are mutable, because
  // actually cloning here is expensive and isn't actually
  // beneficial.
  //
  // Would _love_ to find a way to change their
  // identity.
  if (!featureMap.size) {
    featureMap = new Map();
  }
  if (!folderMap.size) {
    folderMap = new Map();
  }
  if (!layerConfigMap.size) {
    layerConfigMap = new Map();
  }
  const featurePrefix = keys.featurePrefix({
    wrappedFeatureCollectionId,
  });
  const layerConfigPrefix = keys.layerConfigPrefix({
    wrappedFeatureCollectionId,
  });
  const folderPrefix = keys.folderPrefix({ wrappedFeatureCollectionId });
  const presencePrefix = keys.presencePrefix({
    wrappedFeatureCollectionId,
  });
  let shouldUpdateFeatures = false;
  let shouldUpdateFolders = false;
  let shouldUpdatePresences = false;
  let shouldUpdateLayerConfigs = false;

  let shouldSortFeatures = false;
  let shouldSortFolders = false;

  for (const item of change) {
    const key = typeof item.key === "string" ? item.key : item.key[1];
    if (key.startsWith(featurePrefix)) {
      shouldUpdateFeatures = true;
      switch (item.op) {
        case "add":
        case "change": {
          const feature = item.newValue as unknown as IWrappedFeature;
          featureMap.set(feature.id, feature);
          // Record the new feature's UUID-INT mapping
          UIDMap.pushUUID(idMap.current, feature.id);
          if (
            item.op === "add" ||
            (item.op === "change" &&
              (item.oldValue as unknown as IWrappedFeature).at !== feature.at)
          ) {
            shouldSortFeatures = true;
          }
          break;
        }
        case "del": {
          const feature = item.oldValue as unknown as IWrappedFeature;
          featureMap.delete(feature.id);
          UIDMap.deleteUUID(idMap.current, feature.id);
          selection = USelection.removeFeatureFromSelection(
            selection,
            feature.id
          );
          break;
        }
      }
    } else if (key.startsWith(layerConfigPrefix)) {
      shouldUpdateLayerConfigs = true;
      switch (item.op) {
        case "add":
        case "change": {
          const layerConfig = item.newValue as unknown as ILayerConfig;
          layerConfigMap.set(layerConfig.id, layerConfig);
          // Always sort layer configs - no need to optimize here.
          break;
        }
        case "del": {
          // Deletions never require a sorting update.
          const folder = item.oldValue as unknown as ILayerConfig;
          layerConfigMap.delete(folder.id);
          break;
        }
      }
    } else if (key.startsWith(folderPrefix)) {
      shouldUpdateFolders = true;
      switch (item.op) {
        case "add":
        case "change": {
          const folder = item.newValue as IFolder;
          folderMap.set(folder.id, folder);
          if (
            item.op === "add" ||
            (item.op === "change" &&
              (item.oldValue as unknown as IFolder).at !== folder.at)
          ) {
            // Only update if there's a new feature
            // or if an 'at' value changes.
            shouldSortFolders = true;
          }
          break;
        }
        case "del": {
          // Deletions never require a sorting update.
          const folder = item.oldValue as IFolder;
          folderMap.delete(folder.id);
          break;
        }
      }
    } else if (key.startsWith(presencePrefix)) {
      switch (item.op) {
        case "add":
        case "change": {
          const presence = item.newValue as IPresence;
          // Only get the first update of your own presence.
          if (presence.userId !== userId || !presences.has(presence.userId)) {
            shouldUpdatePresences = true;
            presences.set(presence.userId, presence);
          }
          break;
        }
        case "del": {
          const presence = item.oldValue as IPresence;
          if (presence.userId !== userId) {
            shouldUpdatePresences = true;
            presences.delete(presence.userId);
          }
          break;
        }
      }
    }
  }

  const changes: {
    dataAtom?: Data;
    layerConfigAtom?: Map<string, ILayerConfig>;
    presencesAtom?: { presences: Map<number, IPresence> };
  } = {};

  if (shouldUpdateLayerConfigs) {
    layerConfigMap = new Map(
      Array.from(layerConfigMap).sort((a, b) => {
        return sortAts(a[1], b[1]);
      })
    );

    changes.layerConfigAtom = layerConfigMap;
  }

  if (shouldUpdateFeatures || shouldUpdateFolders) {
    if (shouldSortFeatures) {
      featureMap = new Map(
        Array.from(featureMap).sort((a, b) => {
          return sortAts(a[1], b[1]);
        })
      );
    }
    if (shouldSortFolders) {
      folderMap = new Map(
        Array.from(folderMap).sort((a, b) => {
          return sortAts(a[1], b[1]);
        })
      );
    }
    const version = Date.now();
    featureMap.version = version;
    folderMap.version = version;
    changes.dataAtom = { featureMap, folderMap, selection };
  }
  if (shouldUpdatePresences) {
    changes.presencesAtom = { presences: presences };
  }

  return changes;
}

export function useWatchCallback({
  wrappedFeatureCollectionId,
  userId,
  idMap,
}: {
  wrappedFeatureCollectionId: string;
  userId: number;
  idMap: MutableRefObject<IDMap>;
}) {
  return useAtomCallback(
    useCallback(
      (get, set, change: Diff) => {
        const data = get(dataAtom);
        const layerConfigMap = get(layerConfigAtom);
        const { presences } = get(presencesAtom);
        const actions = applyDiff(
          data,
          presences,
          wrappedFeatureCollectionId,
          change,
          idMap,
          userId,
          layerConfigMap
        );

        if (actions.dataAtom) {
          set(dataAtom, actions.dataAtom);
        }
        if (actions.presencesAtom) {
          set(presencesAtom, actions.presencesAtom);
        }
        if (actions.layerConfigAtom) {
          set(layerConfigAtom, actions.layerConfigAtom);
        }
      },
      [wrappedFeatureCollectionId, userId, idMap]
    )
  );
}
