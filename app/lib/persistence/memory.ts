import { useCallback } from "react";
import type {
  IFolder,
  IFolderInput,
  ILayerConfig,
  IWrappedFeature,
  IWrappedFeatureInput,
  LayerConfigMap,
} from "types";
import once from "lodash/once";
import type {
  IPersistence,
  MetaPair,
  MetaUpdatesInput,
} from "app/lib/persistence/ipersistence";
import {
  fMoment,
  UMomentLog,
  UMoment,
  OPPOSITE,
  EMPTY_MOMENT,
  MomentInput,
} from "app/lib/persistence/moment";
import { generateKeyBetween } from "fractional-indexing";
import { useAtom } from "jotai";
import { useAtomCallback } from "jotai/utils";
import {
  Data,
  dataAtom,
  momentLogAtom,
  layerConfigAtom,
  memoryMetaAtom,
} from "state/jotai";
import {
  getFreshAt,
  momentForDeleteFeatures,
  momentForDeleteFolders,
  momentForDeleteLayerConfigs,
  trackMoment,
} from "./shared";
import { IDMap, UIDMap } from "app/lib/id_mapper";
import { sortAts } from "app/lib/parse_stored";

export class MemPersistence implements IPersistence {
  idMap: IDMap;
  constructor(idMap: IDMap) {
    this.idMap = idMap;
  }
  putPresence = async () => {};

  /**
   * This could and should be improved. It does do some weird stuff:
   * we need to write to the moment log and to features.
   */
  // eslint-disable-next-line
  private apply = useAtomCallback(
    useCallback((get, set, moment: MomentInput) => {
      let ctx = get(dataAtom);
      const layerConfigMap = get(layerConfigAtom);
      if (!ctx.featureMap.size) {
        ctx = {
          ...ctx,
          featureMap: new Map(),
        };
      }
      if (!ctx.folderMap.size) {
        ctx = {
          ...ctx,
          folderMap: new Map(),
        };
      }
      const reverse = UMoment.merge(
        fMoment(moment.note || `Reverse`),
        this.deleteFeaturesInner(moment.deleteFeatures, ctx),
        this.deleteFoldersInner(moment.deleteFolders, ctx),
        this.putFeaturesInner(moment.putFeatures, ctx),
        this.putFoldersInner(moment.putFolders, ctx),
        this.putLayerConfigsInner(moment.putLayerConfigs, layerConfigMap),
        this.deleteLayerConfigsInner(moment.deleteLayerConfigs, layerConfigMap)
      );
      set(dataAtom, {
        selection: ctx.selection,
        featureMap: new Map(
          Array.from(ctx.featureMap).sort((a, b) => {
            return sortAts(a[1], b[1]);
          })
        ),
        folderMap: new Map(
          Array.from(ctx.folderMap).sort((a, b) => {
            return sortAts(a[1], b[1]);
          })
        ),
      });
      if (moment.putLayerConfigs?.length || moment.deleteLayerConfigs?.length) {
        set(
          layerConfigAtom,
          new Map(
            Array.from(layerConfigMap).sort((a, b) => {
              return sortAts(a[1], b[1]);
            })
          )
        );
      }
      return reverse;
    }, [])
  );

  // eslint-disable-next-line
  useTransact() {
    // eslint-disable-next-line
    return useAtomCallback(
      // eslint-disable-next-line
      useCallback((get, set, partialMoment: Partial<MomentInput>) => {
        trackMoment(partialMoment);
        const moment: MomentInput = { ...EMPTY_MOMENT, ...partialMoment };
        const result = this.apply(moment);
        set(momentLogAtom, UMomentLog.pushMoment(get(momentLogAtom), result));
        return Promise.resolve();
      }, [])
    );
  }

  useLastPresence() {
    return null;
  }

  useMetadata(): MetaPair {
    // eslint-disable-next-line
    const [meta, setMeta] = useAtom(memoryMetaAtom);
    return [
      {
        type: "memory",
        ...meta,
      },
      (updates: MetaUpdatesInput) => {
        setMeta((meta) => {
          return {
            ...meta,
            ...updates,
          };
        });
        return Promise.resolve();
      },
    ];
  }

  // eslint-disable-next-line
  useHistoryControl = () => {
    return useAtomCallback(
      useCallback((get, set, direction: "undo" | "redo") => {
        const momentLog = UMomentLog.shallowCopy(get(momentLogAtom));
        const moment = momentLog[direction].shift();
        if (!moment) {
          // Nothing to undo
          return Promise.resolve();
        }
        const reverse = this.apply(moment);
        if (UMoment.isEmpty(reverse)) {
          // console.error(
          //   "[SKIPPING] Got an empty reverse, forward: ",
          //   moment,
          //   " reverse: ",
          //   reverse
          // );
          return Promise.resolve();
        }
        const opposite = OPPOSITE[direction];
        momentLog[opposite] = [reverse].concat(momentLog[opposite]);
        set(momentLogAtom, momentLog);
        return Promise.resolve();
      }, [])
    );
  };

  // PRIVATE --------------------------------------------
  //
  /**
   * Inner workings of delete features. Beware,
   * changes ctx by reference.
   *
   * @param features input features
   * @param ctx MUTATED
   * @returns new moment
   */
  private deleteFeaturesInner(
    features: readonly IWrappedFeature["id"][],
    ctx: Data
  ) {
    const moment = momentForDeleteFeatures(features, ctx);
    for (const id of features) {
      ctx.featureMap.delete(id);
    }
    return moment;
  }

  private deleteLayerConfigsInner(
    layerConfigs: readonly ILayerConfig["id"][],
    layerConfigMap: LayerConfigMap
  ) {
    const moment = momentForDeleteLayerConfigs(layerConfigs, layerConfigMap);
    for (const id of layerConfigs) {
      layerConfigMap.delete(id);
    }
    return moment;
  }

  private deleteFoldersInner(folders: readonly IFolder["id"][], ctx: Data) {
    const moment = momentForDeleteFolders(folders, ctx);
    for (const id of folders) {
      ctx.folderMap.delete(id);
    }
    return moment;
  }

  private putFoldersInner(folders: IFolderInput[], ctx: Data) {
    const moment = fMoment("Put folders");

    let lastAt: string | null = null;

    for (const inputFolder of folders) {
      const oldVersion = ctx.folderMap.get(inputFolder.id);
      if (inputFolder.at === undefined) {
        if (!lastAt) lastAt = getFreshAt(ctx);
        const at = generateKeyBetween(lastAt, null);
        lastAt = at;
        inputFolder.at = at;
      }

      if (oldVersion) {
        moment.putFolders.push(oldVersion);
      } else {
        moment.deleteFolders.push(inputFolder.id);
      }
      ctx.folderMap.set(inputFolder.id, inputFolder as IFolder);
    }

    return moment;
  }

  private putFeaturesInner(features: IWrappedFeatureInput[], ctx: Data) {
    const moment = fMoment("Put features");
    const ats = once(() =>
      Array.from(ctx.featureMap.values(), (wrapped) => wrapped.at).sort()
    );
    const atsSet = once(() => new Set(ats()));

    let lastAt: string | null = null;

    for (const inputFeature of features) {
      const oldVersion = ctx.featureMap.get(inputFeature.id);
      if (inputFeature.at === undefined) {
        if (!lastAt) lastAt = getFreshAt(ctx);
        const at = generateKeyBetween(lastAt, null);
        lastAt = at;
        inputFeature.at = at;
      }
      if (oldVersion) {
        moment.putFeatures.push(oldVersion);
      } else {
        moment.deleteFeatures.push(inputFeature.id);
        // If we're inserting a new feature but its
        // at value is already in the set, find it a
        // new value at the start
        if (atsSet().has(inputFeature.at)) {
          inputFeature.at = generateKeyBetween(null, ats()[0]);
        }
      }
      ctx.featureMap.set(inputFeature.id, inputFeature as IWrappedFeature);
      UIDMap.pushUUID(this.idMap, inputFeature.id);
    }

    return moment;
  }

  private putLayerConfigsInner(
    layerConfigs: ILayerConfig[],
    layerConfigMap: LayerConfigMap
  ) {
    const moment = fMoment("Put layer configs");

    for (const layerConfig of layerConfigs) {
      const oldVersion = layerConfigMap.get(layerConfig.id);
      if (oldVersion) {
        moment.putLayerConfigs.push(oldVersion);
      } else {
        moment.deleteLayerConfigs.push(layerConfig.id);
      }
      layerConfigMap.set(layerConfig.id, layerConfig);
    }

    return moment;
  }
}
