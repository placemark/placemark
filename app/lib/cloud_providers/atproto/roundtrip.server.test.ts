import { Result, Schema } from "effect";
import { Base64 } from "effect/encoding";
import { CloudMapDocument } from "shared/atproto_rpc";
import type { IWrappedFeature } from "types";
import { expect, it } from "vitest";
import {
  decodeFlatGeobufToFeatures,
  encodeFeaturesToFlatGeobuf,
} from "./fgb_codec";

/**
 * The full wire path a saved map takes: FlatGeobuf encode -> base64
 * (the same `effect/encoding` Base64 the worker's handlers use) -> the
 * `CloudMapDocument` RPC schema -> base64 decode -> FlatGeobuf decode.
 */
const features: IWrappedFeature[] = [
  {
    id: "f1",
    at: "a0",
    folderId: null,
    feature: {
      type: "Feature",
      geometry: { type: "Point", coordinates: [10, 20] },
      properties: null,
    },
  },
  {
    id: "f2",
    at: "a1",
    folderId: "folder-1",
    feature: {
      type: "Feature",
      geometry: { type: "Point", coordinates: [30, 40] },
      properties: { name: "Cafe", rating: 4.5 },
    },
  },
  {
    id: "f3",
    at: "a2",
    folderId: null,
    feature: {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [0, 0],
          [1, 1],
        ],
      },
      properties: { tags: ["x", "y"], meta: { k: 1 }, open: true },
    },
  },
];

it("preserves every feature through encode, base64, schema, and decode", async () => {
  const bytes = await encodeFeaturesToFlatGeobuf(features);
  const document = Schema.decodeUnknownSync(CloudMapDocument)({
    dataBase64: Base64.encode(bytes),
    symbolization: {},
    layer: null,
    folders: [],
    layerConfigs: [],
  });

  const decodedBytes = Result.getOrThrow(Base64.decode(document.dataBase64));
  const decoded = await decodeFlatGeobufToFeatures(decodedBytes);

  expect(decoded).toStrictEqual(features);
});

it("agrees with the browser-side btoa/atob the editor uses", async () => {
  // The real wire path mixes the two: the editor base64-encodes with
  // `btoa` (cloud_maps.tsx) and decodes with `atob`
  // (load_into_editor.ts), while the worker uses `effect/encoding`.
  const bytes = await encodeFeaturesToFlatGeobuf(features);

  const effectEncoded = Base64.encode(bytes);
  const browserEncoded = btoa(String.fromCharCode(...bytes));
  expect(effectEncoded).toBe(browserEncoded);

  const browserDecoded = Uint8Array.from(atob(effectEncoded), (char) =>
    char.charCodeAt(0),
  );
  expect(browserDecoded).toStrictEqual(bytes);
});
