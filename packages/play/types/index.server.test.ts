import { expect, describe, it, test } from "vitest";

import { newFeatureId } from "app/lib/id";
import {
  zLayerConfigCommon,
  Symbolization,
  SYMBOLIZATION_NONE,
  tryUpgrading,
  SymbolizationBaseInternal,
} from "./index";

test("SymbolizationBaseInternal", () => {
  expect(
    SymbolizationBaseInternal.parse({
      simplestyle: true,
    })
  ).toMatchInlineSnapshot(`
    {
      "defaultColor": "#312E81",
      "defaultOpacity": 0.3,
      "simplestyle": true,
    }
  `);

  expect(
    SymbolizationBaseInternal.parse({
      simplestyle: true,
      defaultOpacity: 10,
    })
  ).toMatchInlineSnapshot(`
    {
      "defaultColor": "#312E81",
      "defaultOpacity": 1,
      "simplestyle": true,
    }
  `);
});

test("zLayerConfigCommon", () => {
  expect(
    zLayerConfigCommon.parse({
      name: "Foo",
      opacity: 10,
      id: newFeatureId(),
      at: "a0",
      visibility: true,
    })
  ).toMatchInlineSnapshot(
    {
      id: expect.any(String),
    },
    `
    {
      "at": "a0",
      "id": Any<String>,
      "name": "Foo",
      "opacity": 1,
      "tms": false,
      "visibility": true,
    }
  `
  );
});

describe("tryUpgrading", () => {
  it("fallback", () => {
    expect(
      tryUpgrading({
        type: "unknown",
      }).isNothing()
    ).toBeTruthy();
  });
  it("simplestyle", () => {
    expect(
      tryUpgrading({
        type: "simplestyle",
      }).unsafeCoerce()
    ).toMatchInlineSnapshot(`
      {
        "defaultColor": "#312E81",
        "defaultOpacity": 0.3,
        "simplestyle": false,
        "type": "none",
      }
    `);
  });
  it("ramp", () => {
    expect(
      tryUpgrading({
        type: "ramp",
        min: {
          input: 10,
          output: "#000",
        },
        max: {
          input: 1,
          output: "#000",
        },
        property: "foo",
      }).unsafeCoerce()
    ).toMatchInlineSnapshot(`
      {
        "defaultColor": "#312E81",
        "defaultOpacity": 0.3,
        "interpolate": "linear",
        "property": "foo",
        "rampName": "RdBl",
        "simplestyle": false,
        "stops": [
          {
            "input": 1,
            "output": "#000",
          },
          {
            "input": 10,
            "output": "#000",
          },
        ],
        "type": "ramp",
      }
    `);
    expect(
      tryUpgrading({
        type: "ramp",
        min: {
          input: 0,
          output: "#000",
        },
        max: {
          input: 1,
          output: "#000",
        },
        property: "foo",
      }).unsafeCoerce()
    ).toMatchInlineSnapshot(`
      {
        "defaultColor": "#312E81",
        "defaultOpacity": 0.3,
        "interpolate": "linear",
        "property": "foo",
        "rampName": "RdBl",
        "simplestyle": false,
        "stops": [
          {
            "input": 0,
            "output": "#000",
          },
          {
            "input": 1,
            "output": "#000",
          },
        ],
        "type": "ramp",
      }
    `);
  });
});

describe("Symbolization", () => {
  test("valid symbolization", () => {
    expect(Symbolization.safeParse(SYMBOLIZATION_NONE)).toHaveProperty(
      "success",
      true
    );
  });

  describe("categorical", () => {
    const other = {
      defaultColor: "#f00",
      simplestyle: true,
      property: "x",
      type: "categorical",
    } as const;

    it("good", () => {
      expect(
        Symbolization.safeParse({
          ...other,
          stops: [
            {
              input: "x",
              output: "#f00f00",
            },
          ],
        })
      ).toHaveProperty("success", true);
    });
    it("transformation", () => {
      expect(
        Symbolization.safeParse({
          ...other,
          stops: [
            {
              input: "x",
              output: "#f00f00",
            },
            {
              input: "x",
              output: "#f00f00",
            },
          ],
        })
      ).toMatchInlineSnapshot(`
        {
          "data": {
            "defaultColor": "#f00",
            "defaultOpacity": 0.3,
            "property": "x",
            "simplestyle": true,
            "stops": [
              {
                "input": "x",
                "output": "#f00f00",
              },
            ],
            "type": "categorical",
          },
          "success": true,
        }
      `);
    });
  });
  describe("ramp", () => {
    const other = {
      defaultColor: "#f00",
      simplestyle: true,
      property: "x",
      type: "ramp",
      interpolate: "step",
      rampName: "RdGn",
    } as const;
    it("good", () => {
      expect(
        Symbolization.safeParse({
          ...other,
          stops: [
            {
              input: 2,
              output: "#f00f00",
            },
          ],
        })
      ).toMatchInlineSnapshot(`
        {
          "data": {
            "defaultColor": "#f00",
            "defaultOpacity": 0.3,
            "interpolate": "step",
            "property": "x",
            "rampName": "RdGn",
            "simplestyle": true,
            "stops": [
              {
                "input": 2,
                "output": "#f00f00",
              },
            ],
            "type": "ramp",
          },
          "success": true,
        }
      `);
      expect(
        Symbolization.safeParse({
          ...other,
          stops: [
            {
              input: 1,
              output: "#f00f00",
            },
            {
              input: 2,
              output: "#f00f00",
            },
          ],
        })
      ).toMatchInlineSnapshot(`
        {
          "data": {
            "defaultColor": "#f00",
            "defaultOpacity": 0.3,
            "interpolate": "step",
            "property": "x",
            "rampName": "RdGn",
            "simplestyle": true,
            "stops": [
              {
                "input": 1,
                "output": "#f00f00",
              },
              {
                "input": 2,
                "output": "#f00f00",
              },
            ],
            "type": "ramp",
          },
          "success": true,
        }
      `);
    });
    it("bad", () => {
      expect(
        Symbolization.safeParse({
          ...other,
          stops: [
            {
              input: 2,
              output: "#f00f00",
            },
            {
              input: 3,
              output: "#f00f00",
            },
            {
              input: 3,
              output: "#f00f00",
            },
          ],
        })
      ).toMatchInlineSnapshot(`
        {
          "data": {
            "defaultColor": "#f00",
            "defaultOpacity": 0.3,
            "interpolate": "step",
            "property": "x",
            "rampName": "RdGn",
            "simplestyle": true,
            "stops": [
              {
                "input": 2,
                "output": "#f00f00",
              },
              {
                "input": 3,
                "output": "#f00f00",
              },
            ],
            "type": "ramp",
          },
          "success": true,
        }
      `);
      expect(
        Symbolization.safeParse({
          ...other,
          stops: [
            {
              input: 3,
              output: "#f00f00",
            },
            {
              input: 2,
              output: "#f00f00",
            },
          ],
        })
      ).toMatchInlineSnapshot(`
        {
          "data": {
            "defaultColor": "#f00",
            "defaultOpacity": 0.3,
            "interpolate": "step",
            "property": "x",
            "rampName": "RdGn",
            "simplestyle": true,
            "stops": [
              {
                "input": 2,
                "output": "#f00f00",
              },
              {
                "input": 3,
                "output": "#f00f00",
              },
            ],
            "type": "ramp",
          },
          "success": true,
        }
      `);
    });
  });
});
