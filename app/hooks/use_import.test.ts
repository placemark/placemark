import { expect, test, vi } from "vitest";

vi.mock("app/lib/worker", () => {
  return {};
});

import { DEFAULT_IMPORT_OPTIONS } from "app/lib/convert";
import { Georeference } from "app/lib/convert/georeference";
import { UIDMap } from "app/lib/id_mapper";
import { MemPersistence } from "app/lib/persistence/memory";
import { createStore } from "jotai";
import { dataAtom, layerConfigAtom, momentLogAtom } from "state/jotai";
import { georeferenceAnnotation } from "test/georeference_annotation";
import { twoPoints, wrapMap } from "test/helpers";
import { zLayerConfig } from "types";
import { getTargetMap, resultToTransact } from "./use_import";

test("annotation features and layers import and undo together", async () => {
  const store = createStore();
  const persistence = new MemPersistence(UIDMap.empty(), store);
  const beforeLayers = store.get(layerConfigAtom).size;
  const result = (
    await Georeference.forwardString(JSON.stringify(georeferenceAnnotation()), {
      ...DEFAULT_IMPORT_OPTIONS,
      type: "georeference",
      georeferenceOptions: { points: true, layer: true, mask: true },
    })
  ).unsafeCoerce();
  const moment = resultToTransact({
    result,
    file: { name: "annotation.json" },
    track: ["import", { format: "georeference" }],
    layerConfigs: store.get(layerConfigAtom),
    sourceUrl: "https://example.com/annotation.json",
  });
  const layer = moment.putLayerConfigs![0];
  expect(zLayerConfig.safeParse(layer).success).toBe(true);
  expect(layer.at < [...store.get(layerConfigAtom).values()][0].at).toBe(true);
  await persistence.useTransact()(moment);
  expect(store.get(dataAtom).featureMap.size).toBe(4);
  expect(store.get(dataAtom).folderMap.size).toBe(2);
  expect(store.get(layerConfigAtom).size).toBe(beforeLayers + 1);
  expect(store.get(momentLogAtom).undo).toHaveLength(1);
  await persistence.useHistoryControl()("undo");
  expect(store.get(dataAtom).featureMap.size).toBe(0);
  expect(store.get(dataAtom).folderMap.size).toBe(0);
  expect(store.get(layerConfigAtom).size).toBe(beforeLayers);
  await persistence.useHistoryControl()("redo");
  expect(store.get(dataAtom).featureMap.size).toBe(4);
  expect(store.get(layerConfigAtom).get(layer.id)).toEqual(layer);
});

test("layer-only annotation import creates no empty folders or features", async () => {
  const result = (
    await Georeference.forwardString(JSON.stringify(georeferenceAnnotation()), {
      ...DEFAULT_IMPORT_OPTIONS,
      type: "georeference",
      georeferenceOptions: { points: false, layer: true, mask: false },
    })
  ).unsafeCoerce();
  const moment = resultToTransact({
    result,
    file: { name: "Imported text" },
    track: ["import", { format: "georeference" }],
  });
  expect(moment.putFeatures).toEqual([]);
  expect(moment.putFolders).toEqual([]);
  expect(moment.putLayerConfigs).toHaveLength(1);
  expect(zLayerConfig.safeParse(moment.putLayerConfigs![0]).success).toBe(true);
});

test("getTargetMap", () => {
  expect(getTargetMap({ featureMap: new Map() }, "x")).toMatchInlineSnapshot(`
    {
      "sourceMissingFieldCount": 0,
      "targetMap": Map {},
    }
  `);
  expect(
    getTargetMap({ featureMap: wrapMap(twoPoints) }, "b"),
  ).toMatchInlineSnapshot(`
      {
        "sourceMissingFieldCount": 1,
        "targetMap": Map {
          "1" => [
            {
              "at": "1",
              "feature": {
                "geometry": {
                  "coordinates": [
                    2,
                    3,
                  ],
                  "type": "Point",
                },
                "properties": {
                  "b": 1,
                },
                "type": "Feature",
              },
              "folderId": null,
              "id": "000000000000000000001",
              "wrappedFeatureCollectionId": "000000000000000000000",
            },
          ],
        },
      }
    `);
});
