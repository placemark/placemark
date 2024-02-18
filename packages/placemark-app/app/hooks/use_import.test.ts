import { expect, vi, test } from "vitest";

vi.mock("app/lib/worker", () => {
  return {};
});

import { twoPoints, wrapMap } from "test/helpers";
import { getTargetMap } from "./use_import";

test("getTargetMap", () => {
  expect(getTargetMap({ featureMap: new Map() }, "x")).toMatchInlineSnapshot(`
    {
      "sourceMissingFieldCount": 0,
      "targetMap": Map {},
    }
  `);
  expect(getTargetMap({ featureMap: wrapMap(twoPoints) }, "b"))
    .toMatchInlineSnapshot(`
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
