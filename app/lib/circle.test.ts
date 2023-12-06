import { getCircleProp, getCircleRadius, makeCircleNative } from "./circle";
import { describe, it, expect } from "vitest";
import { CIRCLE_TYPE } from "state/mode";
import { pointFeature } from "test/helpers";

describe("makeCircleNative", () => {
  it("degrees", () => {
    expect(
      makeCircleNative({
        center: [0, 0],
        value: 10,
        type: CIRCLE_TYPE.DEGREES,
      })
    ).toMatchSnapshot();
  });
  it("geodesic", () => {
    expect(
      makeCircleNative({
        center: [0, 0],
        value: 10,
        type: CIRCLE_TYPE.GEODESIC,
      })
    ).toMatchSnapshot();
  });
  it("mercator", () => {
    const circle = makeCircleNative({
      center: [0, 0],
      value: 10,
      type: CIRCLE_TYPE.MERCATOR,
    });
    expect(circle).toMatchSnapshot();
  });
});

describe("getCircleRadius", () => {
  it("null", () => {
    expect(getCircleRadius(pointFeature)).toBeNull();
  });
});

describe("getCircleProp", () => {
  it("null", () => {
    expect(getCircleProp(pointFeature)).toBeNull();
  });
});
