import type { StyleSpecification } from "@maplibre/maplibre-gl-style-spec";
import { afterEach, describe, expect, it, vi } from "vitest";
import { addMapLibreStyle } from "./layer_config_adapters";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("addMapLibreStyle", () => {
  it("loads a remote style without an access token", async () => {
    const remoteStyle: StyleSpecification = {
      version: 8,
      name: "Positron",
      sources: {
        openmaptiles: {
          type: "vector",
          url: "https://tiles.openfreemap.org/planet",
        },
      },
      layers: [
        {
          id: "labels",
          type: "symbol",
          source: "openmaptiles",
          layout: { "text-field": ["get", "name"] },
        },
      ],
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(remoteStyle), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const style = await addMapLibreStyle(
      { version: 8, sources: {}, layers: [] },
      {
        id: "positron",
        at: "a0",
        name: "Positron (OpenFreeMap)",
        opacity: 1,
        tms: false,
        visibility: true,
        labelVisibility: false,
        type: "STYLE",
        url: "https://tiles.openfreemap.org/styles/positron",
      },
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://tiles.openfreemap.org/styles/positron",
    );
    expect(style.name).toBe("Positron");
    expect(style.sources).toEqual(remoteStyle.sources);
    expect(style.layers).toEqual([]);
  });
});
