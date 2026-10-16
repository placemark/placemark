import { expect, it } from "vitest";
import { sanitizeCacheMode } from "./patch_fetch";

it.for(
  [
    ["no-cache", "no-store"],
    ["reload", "no-store"],
    ["force-cache", "no-store"],
    ["only-if-cached", "no-store"],
    ["no-store", "no-store"],
    ["default", "default"],
  ] as Array<[string, string]>,
)("sanitizeCacheMode(%s) is %s", ([cache, expected]) => {
  expect(sanitizeCacheMode(cache)).toBe(expected);
});

it("passes an absent cache mode through as undefined", () => {
  expect(sanitizeCacheMode(undefined)).toBeUndefined();
});
