import type { Data } from "state/jotai";
import type { LayerConfigMap } from "types";
import type { CloudMapDocument } from "../types";
import { encodeFeaturesToFlatGeobuf } from "./fgb_codec";

interface MapDocMeta {
  symbolization: unknown;
  layer: unknown;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export async function buildCloudMapDoc(
  data: Pick<Data, "featureMap" | "folderMap">,
  layerConfigs: LayerConfigMap,
  meta: MapDocMeta,
): Promise<CloudMapDocument> {
  const bytes = await encodeFeaturesToFlatGeobuf(
    Array.from(data.featureMap.values()),
  );
  return {
    dataBase64: toBase64(bytes),
    symbolization: meta.symbolization,
    layer: meta.layer,
    folders: Array.from(data.folderMap.values()),
    layerConfigs: Array.from(layerConfigs.values()),
  };
}
