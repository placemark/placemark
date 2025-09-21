import { describe, expect, it, test } from "vitest";
import { decode, encode } from "./geohash";

describe("geohash", () => {
  it("testEncodeBasic", () => {
    let hashString = encode([112.5584, 37.8324]);
    expect(hashString).toEqual("ww8p1r4t8");

    hashString = encode([117, 32], 3);
    expect(hashString).toEqual("wte");
  });
});

test("testDecodeBasic", () => {
  const latLon = decode("ww8p1r4t8");
  expect(latLon[0]).toBeCloseTo(112.5584);
  expect(latLon[1]).toBeCloseTo(37.8324);
});
