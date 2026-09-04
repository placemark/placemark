import { layerConfigLayerId } from "app/lib/layer_config_adapters";
import type { ILayerConfig, LayerConfigMap } from "types";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  allmapsLayerId,
  getAllmapsLayerConfigs,
  syncAllmapsLayers,
} from "./allmaps_layer";

const allmapsMock = vi.hoisted(() => ({
  createdLayers: [] as any[],
  failSetOpacity: false,
  moduleLoads: 0,
  WarpedMapLayer: vi.fn(function (this: any, options: any) {
    this.id = options.layerId;
    this.type = "custom";
    this.renderingMode = "2d";
    this.addGeoreferenceAnnotationByUrl = vi.fn(async () => {});
    this.onAdd = vi.fn();
    this.render = vi.fn();
    this.setLayerOptions = vi.fn();
    this.setOpacity = vi.fn(() => {
      if (allmapsMock.failSetOpacity) {
        throw new Error("Renderer not defined");
      }
    });
    allmapsMock.createdLayers.push(this);
  }),
}));

const toastMock = vi.hoisted(() => ({
  error: vi.fn(),
}));

vi.mock("@allmaps/maplibre", () => {
  allmapsMock.moduleLoads++;
  return {
    WarpedMapLayer: allmapsMock.WarpedMapLayer,
  };
});

vi.mock("react-hot-toast", () => ({
  toast: toastMock,
}));

function allmapsLayer(
  overrides: Partial<Extract<ILayerConfig, { type: "ALLMAPS" }>> = {},
): Extract<ILayerConfig, { type: "ALLMAPS" }> {
  return {
    id: "allmaps",
    at: "a0",
    labelVisibility: true,
    name: "Allmaps",
    opacity: 0.5,
    saturation: 1,
    tms: false,
    type: "ALLMAPS",
    url: "https://annotations.allmaps.org/images/d180902cb93d5bf2",
    visibility: true,
    ...overrides,
  };
}

function xyzLayer(id: string): Extract<ILayerConfig, { type: "XYZ" }> {
  return {
    id,
    at: "a0",
    labelVisibility: true,
    name: "XYZ",
    opacity: 1,
    tms: false,
    token: "",
    type: "XYZ",
    url: "https://example.com/{z}/{x}/{y}.png",
    visibility: true,
  };
}

function styleLayer(id: string): Extract<ILayerConfig, { type: "STYLE" }> {
  return {
    id,
    at: "a0",
    labelVisibility: true,
    name: "Style",
    opacity: 1,
    tms: false,
    type: "STYLE",
    url: "https://example.com/style.json",
    visibility: true,
  };
}

function layerConfigMap(layers: ILayerConfig[]): LayerConfigMap {
  return new Map(layers.map((layer) => [layer.id, layer])) as LayerConfigMap;
}

function makeMap(layerIds: string[]) {
  const layers = [...layerIds];
  const insertLayer = (layerId: string, beforeId?: string) => {
    const existingIndex = layers.indexOf(layerId);
    if (existingIndex !== -1) {
      layers.splice(existingIndex, 1);
    }

    const beforeIndex = beforeId ? layers.indexOf(beforeId) : -1;
    if (beforeIndex === -1) {
      layers.push(layerId);
    } else {
      layers.splice(beforeIndex, 0, layerId);
    }
  };

  return {
    addLayer: vi.fn((layer: { id: string }, _beforeId?: string) => {
      insertLayer(layer.id, _beforeId);
    }),
    getLayer: vi.fn((id: string) => {
      return layers.includes(id) ? { id } : undefined;
    }),
    getStyle: vi.fn(() => {
      return {
        layers: layers.map((id) => ({ id })),
      };
    }),
    moveLayer: vi.fn((id: string, beforeId?: string) => {
      insertLayer(id, beforeId);
    }),
    removeLayer: vi.fn((id: string) => {
      const index = layers.indexOf(id);
      if (index !== -1) {
        layers.splice(index, 1);
      }
    }),
  };
}

describe("getAllmapsLayerConfigs", () => {
  it("finds Allmaps layer configs", () => {
    expect(
      getAllmapsLayerConfigs(layerConfigMap([xyzLayer("xyz"), allmapsLayer()])),
    ).toEqual([allmapsLayer()]);
  });
});

describe("syncAllmapsLayers", () => {
  afterEach(() => {
    allmapsMock.createdLayers.length = 0;
    allmapsMock.failSetOpacity = false;
    allmapsMock.WarpedMapLayer.mockClear();
    toastMock.error.mockClear();
  });

  it("does not load Allmaps when there are no Allmaps layers", async () => {
    await syncAllmapsLayers({
      map: makeMap(["features-fill"]) as any,
      layerCache: new Map(),
      layerConfigs: layerConfigMap([xyzLayer("xyz")]),
    });

    expect(allmapsMock.moduleLoads).toBe(0);
    expect(allmapsMock.WarpedMapLayer).not.toHaveBeenCalled();
  });

  it("does not add Allmaps layers when the style sync is stale", async () => {
    await syncAllmapsLayers({
      map: makeMap(["features-fill"]) as any,
      layerCache: new Map(),
      layerConfigs: layerConfigMap([allmapsLayer()]),
      isStale: () => true,
    });

    expect(allmapsMock.moduleLoads).toBe(0);
    expect(allmapsMock.WarpedMapLayer).not.toHaveBeenCalled();
  });

  it("adds Allmaps custom layers below the closest layer above them", async () => {
    const aboveLayer = xyzLayer("above");
    const layer = allmapsLayer({ id: "below", visibility: false });
    const map = makeMap(["features-fill", layerConfigLayerId(aboveLayer)]);

    await syncAllmapsLayers({
      map: map as any,
      layerCache: new Map(),
      layerConfigs: layerConfigMap([aboveLayer, layer]),
    });

    expect(allmapsMock.WarpedMapLayer).toHaveBeenCalledWith({
      layerId: allmapsLayerId(layer.id),
      opacity: 0.5,
      saturation: 1,
      visible: false,
    });
    expect(map.addLayer).toHaveBeenCalledWith(
      allmapsMock.createdLayers[0],
      layerConfigLayerId(aboveLayer),
    );
    expect(allmapsMock.createdLayers[0].setOpacity).toHaveBeenCalledWith(0.5);
    expect(allmapsMock.createdLayers[0].setLayerOptions).toHaveBeenCalledWith({
      saturation: 1,
      visible: false,
    });
    expect(
      allmapsMock.createdLayers[0].addGeoreferenceAnnotationByUrl,
    ).toHaveBeenCalledWith(layer.url);
  });

  it("adds Allmaps custom layers underneath a MapLibre style", async () => {
    const layer = allmapsLayer({ id: "below-style" });
    const map = makeMap(["style-background", "style-label", "features-fill"]);

    await syncAllmapsLayers({
      map: map as any,
      layerCache: new Map(),
      layerConfigs: layerConfigMap([styleLayer("style"), layer]),
    });

    expect(map.addLayer).toHaveBeenCalledWith(
      allmapsMock.createdLayers[0],
      "style-background",
    );
  });

  it("syncs Allmaps layer saturation", async () => {
    const layer = allmapsLayer({ saturation: 0 });

    await syncAllmapsLayers({
      map: makeMap(["features-fill"]) as any,
      layerCache: new Map(),
      layerConfigs: layerConfigMap([layer]),
    });

    expect(allmapsMock.WarpedMapLayer).toHaveBeenCalledWith({
      layerId: allmapsLayerId(layer.id),
      opacity: 0.5,
      saturation: 0,
      visible: true,
    });
    expect(allmapsMock.createdLayers[0].setLayerOptions).toHaveBeenCalledWith({
      saturation: 0,
      visible: true,
    });
  });

  it("moves existing Allmaps layers without recreating them", async () => {
    const aboveLayer = xyzLayer("above");
    const layer = allmapsLayer();
    const map = makeMap(["features-fill", layerConfigLayerId(aboveLayer)]);
    const layerCache = new Map();

    await syncAllmapsLayers({
      map: map as any,
      layerCache,
      layerConfigs: layerConfigMap([layer]),
    });
    await syncAllmapsLayers({
      map: map as any,
      layerCache,
      layerConfigs: layerConfigMap([aboveLayer, layer]),
    });

    expect(allmapsMock.WarpedMapLayer).toHaveBeenCalledTimes(1);
    expect(
      allmapsMock.createdLayers[0].addGeoreferenceAnnotationByUrl,
    ).toHaveBeenCalledTimes(1);
    expect(map.moveLayer).toHaveBeenCalledWith(
      allmapsLayerId(layer.id),
      layerConfigLayerId(aboveLayer),
    );
  });

  it("does not show a load failure when an existing layer cannot be updated", async () => {
    const layer = allmapsLayer();
    const map = makeMap(["features-fill", allmapsLayerId(layer.id)]);
    allmapsMock.failSetOpacity = true;

    await syncAllmapsLayers({
      map: map as any,
      layerCache: new Map(),
      layerConfigs: layerConfigMap([layer]),
    });

    expect(map.addLayer).not.toHaveBeenCalled();
    expect(map.moveLayer).toHaveBeenCalledWith(
      allmapsLayerId(layer.id),
      "features-fill",
    );
    expect(toastMock.error).not.toHaveBeenCalled();
  });
});
