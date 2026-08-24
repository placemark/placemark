import type { StyleSpecification } from "@maplibre/maplibre-gl-style-spec";
import { describe, expect, it } from "vitest";
import { makeMapboxStyleMapLibreCompatible } from "./layer_config_adapters";

describe("makeMapboxStyleMapLibreCompatible", () => {
  it("translates Mapbox resource URLs without changing external sources", () => {
    const style: StyleSpecification = {
      version: 8,
      sprite: "mapbox://sprites/example/streets-v1",
      glyphs: "mapbox://fonts/example/{fontstack}/{range}.pbf",
      sources: {
        streets: {
          type: "vector",
          url: "mapbox://example.streets",
        },
        external: {
          type: "raster",
          url: "https://example.com/tiles.json",
        },
      },
      layers: [],
    };

    expect(makeMapboxStyleMapLibreCompatible(style, "pk.test/token")).toEqual({
      ...style,
      sprite:
        "https://api.mapbox.com/styles/v1/example/streets-v1/sprite?access_token=pk.test%2Ftoken",
      glyphs:
        "https://api.mapbox.com/fonts/v1/example/{fontstack}/{range}.pbf?access_token=pk.test%2Ftoken",
      sources: {
        streets: {
          type: "vector",
          url: "https://api.mapbox.com/v4/example.streets.json?secure&access_token=pk.test%2Ftoken",
        },
        external: {
          type: "raster",
          url: "https://example.com/tiles.json",
        },
      },
    });

    expect(style.sprite).toBe("mapbox://sprites/example/streets-v1");
  });
});
