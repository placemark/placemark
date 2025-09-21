import { describe, expect, it } from "vitest";

import { convex } from "./concaveman";

describe("convex", () => {
  it("generates convex shape from points", () => {
    expect(
      convex({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {},
            geometry: {
              type: "Point",
              coordinates: [0, 0],
            },
          },
          {
            type: "Feature",
            properties: {},
            geometry: {
              type: "Point",
              coordinates: [2, 2],
            },
          },
          {
            type: "Feature",
            properties: {},
            geometry: {
              type: "Point",
              coordinates: [0, 4],
            },
          },
        ],
      }),
    ).toEqualRight({
      geometry: {
        coordinates: [
          [
            [2, 2],
            [0, 0],
            [0, 4],
            [2, 2],
          ],
        ],
        type: "Polygon",
      },
      properties: {},
      type: "Feature",
    });
  });
});
