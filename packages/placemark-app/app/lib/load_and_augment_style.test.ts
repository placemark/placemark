import { expect, describe, it, vi, test } from "vitest";

import loadAndAugmentStyle, {
  addEditingLayers,
  makeLayers,
} from "./load_and_augment_style";
import { NIL_PREVIEW } from "test/helpers";
import { validate } from "@mapbox/mapbox-gl-style-spec";
import { ILayerConfig, ISymbolization } from "types";
import { purple900 } from "app/lib/constants";
import { exportStyle } from "app/lib/export_style";

vi.mock("app/lib/env_client", () => {
  return {
    env: {
      NEXT_PUBLIC_MAPBOX_TOKEN: "xxx",
    },
  };
});

const NONE_NO_SIMPLESTYLE: ISymbolization = {
  type: "none",
  simplestyle: false,
  defaultColor: purple900,
  defaultOpacity: 0.3,
};

describe("makeLayers", () => {
  it("none", () => {
    expect(
      makeLayers({
        symbolization: NONE_NO_SIMPLESTYLE,
        previewProperty: NIL_PREVIEW,
      })
    ).toMatchSnapshot();
  });
  it("with preview property", () => {
    const inputs = {
      symbolization: NONE_NO_SIMPLESTYLE,
      previewProperty: "foo",
    };

    expect(makeLayers(inputs)).toMatchSnapshot();

    const emptyStyle: mapboxgl.Style = {
      version: 8,
      glyphs: "https://foo.com/foo{fontstack}/{range}",
      sources: {},
      layers: [],
    };
    addEditingLayers({ style: emptyStyle, ...inputs });
    expect(validate(emptyStyle)).toEqual([]);
  });
  it("ramp", () => {
    const ramp = {
      type: "ramp",
      property: "foo",
      simplestyle: false,
      interpolate: "linear",
      rampName: "xx",
      defaultColor: purple900,
      defaultOpacity: 0.3,
      stops: [
        {
          input: 1,
          output: "#fff000",
        },
        {
          input: 10,
          output: "#fff000",
        },
      ],
    } as ISymbolization;
    const inputs = {
      symbolization: ramp,
      previewProperty: NIL_PREVIEW,
    };
    expect(makeLayers(inputs)).toMatchSnapshot();
    expect(exportStyle(ramp)).toMatchSnapshot();

    const emptyStyle: mapboxgl.Style = {
      version: 8,
      sources: {},
      layers: [],
    };
    addEditingLayers({ style: emptyStyle, ...inputs });
    expect(validate(emptyStyle)).toEqual([]);
  });
  it("categorical", () => {
    const categorical = {
      type: "categorical",
      simplestyle: false,
      property: "foo",
      defaultColor: purple900,
      defaultOpacity: 0.3,
      stops: [
        {
          input: 1,
          output: "#fff000",
        },
      ],
    } as ISymbolization;
    const inputs = {
      symbolization: categorical,
      previewProperty: NIL_PREVIEW,
    } as const;
    expect(exportStyle(categorical)).toMatchSnapshot();
    const layers = makeLayers(inputs);
    const emptyStyle: mapboxgl.Style = {
      version: 8,
      sources: {},
      layers: [],
    };
    addEditingLayers({ style: emptyStyle, ...inputs });
    expect(validate(emptyStyle)).toEqual([]);
    expect(layers).toMatchSnapshot();
  });
  it("categorical with override", () => {
    const categorical = {
      type: "categorical",
      simplestyle: true,
      property: "foo",
      defaultColor: purple900,
      defaultOpacity: 0.3,
      stops: [
        {
          input: 1,
          output: "#fff000",
        },
      ],
    } as ISymbolization;
    expect(exportStyle(categorical)).toMatchSnapshot();
  });
});

test("loadAndAugmentStyle", async () => {
  await expect(
    loadAndAugmentStyle({
      layerConfigs: new Map([
        [
          "00",
          {
            type: "XYZ",
            at: "a0",
            visibility: true,
            opacity: 1,
            tms: true,
            url: "https://foo.com/{z}/{x}/{y}.png",
          } as ILayerConfig,
        ],
      ]),
      symbolization: NONE_NO_SIMPLESTYLE,
      previewProperty: NIL_PREVIEW,
    })
  ).resolves.toMatchSnapshot();
});
