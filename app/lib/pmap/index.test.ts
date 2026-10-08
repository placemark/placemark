import loadAndAugmentStyle from "app/lib/load_and_augment_style";
import type { StyleSpecification } from "maplibre-gl";
import type { LayerConfigMap } from "types";
import { afterEach, expect, it, vi } from "vitest";
import PMap from "./index";

vi.mock("maplibre-gl", () => ({ setWorkerUrl: vi.fn() }));
vi.mock("app/lib/allmaps_layer", () => ({ syncAllmapsLayers: vi.fn() }));
vi.mock("app/lib/load_and_augment_style", async (importOriginal) => ({
  ...(await importOriginal<typeof import("app/lib/load_and_augment_style")>()),
  default: vi.fn(),
}));

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

it("applies a pending base style after an Allmaps-only update", async () => {
  vi.useFakeTimers();
  const style = Promise.withResolvers<StyleSpecification>();
  vi.mocked(loadAndAugmentStyle).mockReturnValue(style.promise);
  const pmap = Object.assign(Object.create(PMap.prototype) as PMap, {
    map: { setStyle: vi.fn() },
    allmapsLayerCache: new Map(),
    styleGeneration: 0,
    lastLayer: null,
    lastMapLibreLayerConfigKey: null,
    lastSymbolization: null,
    lastPreviewProperty: null,
    lastData: null,
  });
  const options = {
    symbolization: {
      type: "none",
      simplestyle: false,
      defaultColor: "#ff0000",
      defaultOpacity: 0.3,
    },
    previewProperty: null,
  } as const;
  const firstSync = pmap.setStyle({ ...options, layerConfigs: new Map() });
  const layerConfigs: LayerConfigMap = new Map([
    [
      "allmaps",
      {
        id: "allmaps",
        type: "ALLMAPS",
        at: "a0",
        name: "Allmaps",
        opacity: 1,
        saturation: 1,
        visibility: true,
        labelVisibility: true,
        tms: false,
        url: "https://example.com/annotation.json",
      },
    ],
  ]);
  const nextSync = pmap.setStyle({ ...options, layerConfigs });
  const baseStyle: StyleSpecification = { version: 8, sources: {}, layers: [] };
  style.resolve(baseStyle);
  await vi.runAllTimersAsync();
  await Promise.all([firstSync, nextSync]);

  expect(pmap.map.setStyle).toHaveBeenCalledExactlyOnceWith(baseStyle);
});
