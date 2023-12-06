import { useMutation, useQuery, invalidateQuery } from "@blitzjs/rpc";
import type { Replicache } from "replicache";
import type {
  IWrappedFeature,
  IPresence,
  IFolder,
  IWrappedFeatureInput,
  IFolderInput,
  ILayerConfig,
  LayerConfigMap,
} from "types";
import type { clientMutators } from "app/lib/replicache/client/mutators";
import type {
  IPersistence,
  MetaPair,
  MetaUpdatesInput,
  TransactOptions,
} from "app/lib/persistence/ipersistence";
import {
  fMoment,
  UMoment,
  UMomentLog,
  OPPOSITE,
  EMPTY_MOMENT,
  Moment,
  MomentInput,
} from "./moment";
import { useCallback } from "react";
import { useAtomCallback } from "jotai/utils";
import { Data, dataAtom, layerConfigAtom, momentLogAtom } from "state/jotai";
import getWrappedFeatureCollection from "app/wrappedFeatureCollections/queries/getWrappedFeatureCollection";
import getLastPresence from "app/users/queries/getLastPresence";
import editWrappedFeatureCollectionMutation from "app/wrappedFeatureCollections/mutations/editWrappedFeatureCollection";
import { DEFAULT_QUERY_OPTIONS } from "app/lib/constants";
import { generateKeyBetween } from "fractional-indexing";
import {
  momentForDeleteFolders,
  momentForDeleteFeatures,
  momentForDeleteLayerConfigs,
  getFreshAt,
  trackMoment,
} from "./shared";
import { IDMap } from "app/lib/id_mapper";

export class RepPersistence implements IPersistence {
  private rep: PReplicache;
  private wrappedFeatureCollectionId: string;
  idMap: IDMap;

  constructor({
    rep,
    wrappedFeatureCollectionId,
    idMap,
  }: {
    rep: PReplicache;
    wrappedFeatureCollectionId: string;
    idMap: IDMap;
  }) {
    Object.assign(this, { createdAt: Date.now() });
    this.rep = rep;
    this.wrappedFeatureCollectionId = wrappedFeatureCollectionId;
    // We're experimentally taking IDMap along for the ride just
    // to simplify things, otherwise this would require another
    // context.
    this.idMap = idMap;
  }

  private get cache() {
    return this.rep;
  }

  // BLITZ RPC ----------------------------------------------------------------
  useMetadata(): MetaPair {
    // eslint-disable-next-line
    const [wrappedFeatureCollection] = useQuery(
      getWrappedFeatureCollection,
      {
        id: this.wrappedFeatureCollectionId,
      },
      DEFAULT_QUERY_OPTIONS
    );

    // eslint-disable-next-line
    const [editWrappedFeatureCollection] = useMutation(
      editWrappedFeatureCollectionMutation
    );

    return [
      wrappedFeatureCollection,
      async (updates: MetaUpdatesInput) => {
        await editWrappedFeatureCollection({
          id: this.wrappedFeatureCollectionId,
          ...updates,
        });
        await invalidateQuery(getWrappedFeatureCollection, {
          id: this.wrappedFeatureCollectionId,
        });
      },
    ];
  }

  useLastPresence() {
    // eslint-disable-next-line
    const [lastPresence] = useQuery(
      getLastPresence,
      {
        wrappedFeatureCollectionId: this.wrappedFeatureCollectionId,
      },
      {
        enabled: !!this.wrappedFeatureCollectionId,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
      }
    );
    return lastPresence ?? null;
  }

  private async apply(
    moment: MomentInput,
    ctx: Data,
    layerConfigMap: LayerConfigMap
  ): Promise<Moment> {
    const reverse = UMoment.merge(
      fMoment(moment.note || "Edited the map"),
      await this.deleteFoldersInner(moment.deleteFolders, ctx),
      await this.putFoldersInner(moment.putFolders, ctx),
      await this.deleteFeaturesInner(moment.deleteFeatures, ctx),
      await this.putFeaturesInner(moment.putFeatures, ctx),
      await this.putLayerConfigsInner(moment.putLayerConfigs, layerConfigMap),
      await this.deleteLayerConfigsInner(
        moment.deleteLayerConfigs,
        layerConfigMap
      )
    );
    return reverse;
  }

  // REPLICACHE APIS -----------------------------------------------------------

  // eslint-disable-next-line
  useTransact = () => {
    const rep = this.rep;
    return useAtomCallback(
      useCallback(
        async (
          get,
          set,
          partialMoment: Partial<MomentInput> & TransactOptions
        ) => {
          trackMoment(partialMoment);
          const moment: MomentInput = { ...EMPTY_MOMENT, ...partialMoment };
          // Result is the moment as inverse. So if it's putFeatures,
          // result is deleteFeatures.
          const result = await this.apply(
            moment,
            get(dataAtom),
            get(layerConfigAtom)
          );
          if (partialMoment.quiet !== true) {
            set(momentLogAtom, (oldLog) =>
              UMomentLog.pushMoment(oldLog, result)
            );
          }
        },
        // eslint-disable-next-line
        [rep]
      )
    );
  };

  // eslint-disable-next-line
  putPresence = async (presence: Omit<IPresence, "replicacheClientId">) => {
    await this.cache.mutate.putPresence({
      ...presence,
      wrappedFeatureCollectionId: this.wrappedFeatureCollectionId,
    });
  };

  // eslint-disable-next-line
  useHistoryControl = () => {
    const rep = this.rep;
    return useAtomCallback(
      useCallback(
        async (get, set, direction: "undo" | "redo") => {
          const momentLog = UMomentLog.shallowCopy(get(momentLogAtom));
          const moment = momentLog[direction].shift();
          if (!moment) {
            // Nothing to undo
            return;
          }
          const reverse = await this.apply(
            moment,
            get(dataAtom),
            get(layerConfigAtom)
          );
          if (UMoment.isEmpty(reverse)) {
            // console.error(
            //   "[SKIPPING] Got an empty reverse, forward: ",
            //   moment,
            //   " reverse: ",
            //   reverse
            // );
            return;
          }
          const opposite = OPPOSITE[direction];
          momentLog[opposite] = [reverse].concat(momentLog[opposite]);
          set(momentLogAtom, momentLog);
        },
        // eslint-disable-next-line
        [rep]
      )
    );
  };

  // INTERNAL -----------------------------------------------------------------
  private deleteFoldersInner = async (
    ids: readonly IFolder["id"][],
    ctx: Data
  ) => {
    if (!ids.length) return EMPTY_MOMENT;
    const moment = momentForDeleteFolders(ids, ctx);
    await this.cache.mutate.deleteFolders({
      folders: ids.slice(),
      wrappedFeatureCollectionId: this.wrappedFeatureCollectionId,
    });
    return moment;
  };

  private putFoldersInner = async (folders: IFolderInput[], ctx: Data) => {
    if (!folders.length) return EMPTY_MOMENT;
    const moment = fMoment("Update folder");
    const folderMap = ctx.folderMap;
    let lastAt: string | null = null;
    for (const inputFolder of folders) {
      if (inputFolder.at === undefined) {
        if (!lastAt) lastAt = getFreshAt(ctx);
        const at = generateKeyBetween(lastAt, null);
        lastAt = at;
        inputFolder.at = at;
      }
      const id = inputFolder.id;
      const folder = folderMap.get(id);
      if (folder) {
        // There was a previous version of this feature -
        // record it in this moment.
        moment.putFolders.push(folder);
      } else {
        // There wasn't.
        moment.deleteFolders.push(id);
      }
    }
    await this.cache.mutate.putFolders({
      folders: folders as IFolder[],
      wrappedFeatureCollectionId: this.wrappedFeatureCollectionId,
    });
    return moment;
  };

  private putLayerConfigsInner = async (
    layerConfigs: ILayerConfig[],
    layerConfigMap: LayerConfigMap
  ) => {
    if (!layerConfigs.length) return EMPTY_MOMENT;
    const moment = fMoment("Update layer configs");
    // Allow incoming features to have blank .at properties
    let lastAt: string | null = null;
    for (const inputLayerConfig of layerConfigs) {
      const id = inputLayerConfig.id;
      if (inputLayerConfig.at === undefined) {
        // TODO: compute this properly
        if (!lastAt) lastAt = "a0";
        const at = generateKeyBetween(lastAt, null);
        lastAt = at;
        inputLayerConfig.at = at;
      }
      const layerConfig = layerConfigMap.get(id);
      if (layerConfig) {
        // There was a previous version of this feature -
        // record it in this moment.
        moment.putLayerConfigs.push(layerConfig);
      } else {
        // There wasn't.
        moment.deleteLayerConfigs.push(id);
      }
    }
    await this.cache.mutate.putLayerConfigs({
      layerConfigs: layerConfigs,
      wrappedFeatureCollectionId: this.wrappedFeatureCollectionId,
    });
    return moment;
  };

  /**
   * Delete features. Used in apply.
   */
  private deleteLayerConfigsInner = async (
    ids: readonly IWrappedFeature["id"][],
    layerConfigMap: LayerConfigMap
  ) => {
    if (!ids.length) return EMPTY_MOMENT;
    const moment = momentForDeleteLayerConfigs(ids, layerConfigMap);
    await this.cache.mutate.deleteLayerConfigs({
      layerConfigs: ids.slice(),
      wrappedFeatureCollectionId: this.wrappedFeatureCollectionId,
    });
    return moment;
  };

  private putFeaturesInner = async (
    features: IWrappedFeatureInput[],
    ctx: Data
  ) => {
    if (!features.length) return EMPTY_MOMENT;
    const moment = fMoment("Update features");
    // Allow incoming features to have blank .at properties
    let lastAt: string | null = null;
    for (const inputFeature of features) {
      const id = inputFeature.id;
      if (inputFeature.at === undefined) {
        if (!lastAt) lastAt = getFreshAt(ctx);
        const at = generateKeyBetween(lastAt, null);
        lastAt = at;
        inputFeature.at = at;
      }
      const feature = ctx.featureMap.get(id);
      if (feature) {
        // There was a previous version of this feature -
        // record it in this moment.
        moment.putFeatures.push(feature);
      } else {
        // There wasn't.
        moment.deleteFeatures.push(id);
      }
    }
    await this.cache.mutate.putFeatures({
      features,
      wrappedFeatureCollectionId: this.wrappedFeatureCollectionId,
    });
    return moment;
  };

  /**
   * Delete features. Used in apply.
   */
  private deleteFeaturesInner = async (
    ids: readonly IWrappedFeature["id"][],
    ctx: Data
  ) => {
    if (!ids.length) return EMPTY_MOMENT;
    const moment = momentForDeleteFeatures(ids, ctx);
    await this.cache.mutate.deleteFeatures({
      features: ids.slice(),
      wrappedFeatureCollectionId: this.wrappedFeatureCollectionId,
    });
    return moment;
  };
}

export type PReplicache = Replicache<typeof clientMutators>;
