import { UIDMap } from "app/lib/id_mapper";
import { usePersistence } from "app/lib/persistence/context";
import { CMomentLog } from "app/lib/persistence/moment";
import { useAtomCallback } from "jotai/utils";
import { useCallback } from "react";
import {
  cloudMapAtom,
  dataAtom,
  fileInfoAtom,
  layerConfigAtom,
  memoryMetaAtom,
  momentLogAtom,
} from "state/jotai";
import { Folder, SYMBOLIZATION_NONE, tryUpgrading, zLayerConfig } from "types";
import { z } from "zod";
import type { CloudMapDocument } from "../types";
import { decodeFlatGeobufToFeatures } from "./fgb_codec";

const Folders = z.array(Folder);
const LayerConfigs = z.array(zLayerConfig);

export interface CloudMapSource {
  providerId: string;
  rkey: string;
  ownerDid: string;
}

export function useLoadCloudMapIntoEditor() {
  const rep = usePersistence();
  return useAtomCallback(
    useCallback(
      async (
        _get,
        set,
        doc: CloudMapDocument,
        name: string,
        source: CloudMapSource,
      ) => {
        const bytes = Uint8Array.from(atob(doc.dataBase64), (char) =>
          char.charCodeAt(0),
        );
        const features = await decodeFlatGeobufToFeatures(bytes);
        const folders = Folders.parse(doc.folders);
        const layerConfigs = LayerConfigs.parse(doc.layerConfigs);

        // Features arrive with no entry in the shared idMap, which
        // map_component relies on to turn clicks back into feature
        // UUIDs — without this, loaded features render but can't be
        // selected or edited.
        UIDMap.loadIdsFromPersistence(rep.idMap, features);

        set(dataAtom, {
          featureMap: new Map(features.map((feature) => [feature.id, feature])),
          folderMap: new Map(folders.map((folder) => [folder.id, folder])),
          selection: { type: "none" },
        });

        set(
          layerConfigAtom,
          new Map(layerConfigs.map((config) => [config.id, config])),
        );

        set(memoryMetaAtom, {
          symbolization: tryUpgrading(doc.symbolization).orDefault(
            SYMBOLIZATION_NONE,
          ),
          label: name,
          layer: doc.layer,
        });

        set(momentLogAtom, new CMomentLog());
        set(cloudMapAtom, { ...source, name });
        set(fileInfoAtom, null);
      },
      [rep],
    ),
  );
}
