import {
  IWrappedFeature,
  IFolder,
  IPresence,
  ILayerConfig,
  LayerConfigMap,
} from "types";
import { fMoment, Moment, MomentInput, UMomentLog } from "./moment";
import { useCallback } from "react";
import { useAtomCallback } from "jotai/utils";
import { useAtomValue } from "jotai";
import { Data, dataAtom, momentLogAtom, presencesAtom } from "state/jotai";
import { EMPTY_ARRAY } from "app/lib/constants";

// This  used to send to posthog, but now could be removed
// or wired into your own product analytics.
export function trackMoment(partialMoment: Partial<MomentInput>) {
  const { track } = partialMoment;
  if (track) {
    delete partialMoment.track;
  }
}

/**
 * Same as momentForDeleteFolders but for features:
 * create an undelete operation.
 *
 * @param features The folders to delete by ID
 * @param param1 internal context
 * @returns a moment with an undelete
 */
export function momentForDeleteFeatures(
  features: readonly IWrappedFeature["id"][],
  { featureMap }: Data
): Moment {
  const moment = fMoment("Update features");
  for (const id of features) {
    const feature = featureMap.get(id);
    if (feature) {
      moment.putFeatures.push(feature);
    }
  }
  return moment;
}

export function momentForDeleteLayerConfigs(
  layerConfigs: readonly ILayerConfig["id"][],
  layerConfigMap: LayerConfigMap
): Moment {
  const moment = fMoment("Update layers");
  for (const id of layerConfigs) {
    const layerConfig = layerConfigMap.get(id);
    if (layerConfig) {
      moment.putLayerConfigs.push(layerConfig);
    }
  }
  return moment;
}

/**
 * Given the current folder map, this tries to find the folders
 * you’re about to delete, and if they can be found, adds an
 * undelete operation as the undo to a Moment object.
 *
 * @param folders The folders to delete by ID
 * @param param1 internal
 * @returns a moment
 */
export function momentForDeleteFolders(
  folders: readonly IFolder["id"][],
  { folderMap }: Data
): Moment {
  const moment = fMoment("Update folders");
  for (const id of folders) {
    const folder = folderMap.get(id);
    if (folder) {
      moment.putFolders.push(folder);
    }
  }
  return moment;
}

function getLastAtInMap(map: Map<unknown, IFolder | IWrappedFeature>): string {
  let lastAt = "a0";
  for (const val of map.values()) {
    lastAt = val.at;
  }
  return lastAt;
}

/**
 * Get the last known at value from
 * a state ctx. This takes O(n) wrt length of both
 * arrays. It would be nice for the design to eliminate
 * the need for this by keeping things sorted. That is a big TODO.
 *
 * @param ctx
 * @returns the last at, or a0
 */
export function getFreshAt(ctx: Data): string {
  const a = getLastAtInMap(ctx.featureMap);
  const b = getLastAtInMap(ctx.folderMap);
  return a > b ? a : b;
}

export function useEndSnapshot() {
  return useAtomCallback(
    useCallback((_get, set) => {
      set(momentLogAtom, (momentLog) => UMomentLog.endSnapshot(momentLog));
    }, [])
  );
}

export function useStartSnapshot() {
  return useAtomCallback(
    useCallback(
      (_get, set, feature: Parameters<typeof UMomentLog.startSnapshot>[1]) => {
        set(momentLogAtom, (momentLog) =>
          UMomentLog.startSnapshot(momentLog, feature)
        );
      },
      []
    )
  );
}

export function usePresences(userId: number | undefined): IPresence[] {
  const rawPresences = useAtomValue(presencesAtom).presences.entries();
  if (userId === undefined) return EMPTY_ARRAY as IPresence[];
  const others = Array.from(rawPresences).filter((pair) => {
    return pair[0] !== userId;
  });
  if (others.length === 0) return EMPTY_ARRAY as IPresence[];
  return others.map((val) => val[1]);
}

/**
 * Dangerous! This makes the assumption that the
 * previous history state is about to be undone. This
 * is only used in the double-click case for now.
 */
export function usePopMoment() {
  return useAtomCallback(
    useCallback((_get, set, n: number) => {
      set(momentLogAtom, (momentLog) => UMomentLog.popMoment(momentLog, n));
    }, [])
  );
}

/**
 * Subscribe to the raw map of features indexed
 * by ID.
 *
 * @returns map of folders
 */
export function useFeatureMap(): Map<string, IWrappedFeature> {
  return useAtomValue(dataAtom).featureMap;
}

/**
 * Subscribe to the raw map of features indexed
 * by ID.
 *
 * @returns map of folders
 */
export function useFolderMap(): Map<string, IFolder> {
  return useAtomValue(dataAtom).folderMap;
}
