import { describe, expect, it } from "vitest";
import { sanitizeCacheMode } from "./patch_fetch";

describe("sanitizeCacheMode", () => {
  it("translates no-cache to no-store", () => {
    expect(sanitizeCacheMode("no-cache")).toBe("no-store");
  });

  it("translates reload, force-cache, and only-if-cached to no-store", () => {
    expect(sanitizeCacheMode("reload")).toBe("no-store");
    expect(sanitizeCacheMode("force-cache")).toBe("no-store");
    expect(sanitizeCacheMode("only-if-cached")).toBe("no-store");
  });

  it("leaves no-store itself unchanged", () => {
    expect(sanitizeCacheMode("no-store")).toBe("no-store");
  });

  it("leaves default unchanged", () => {
    expect(sanitizeCacheMode("default")).toBe("default");
  });

  it("returns undefined for an absent cache mode", () => {
    expect(sanitizeCacheMode(undefined)).toBeUndefined();
  });
});
