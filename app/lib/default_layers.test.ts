import { describe, expect, it, vi } from "vitest";

vi.mock("app/lib/env_client", () => {
  return {
    env: {
      VITE_PUBLIC_MAPTILER_TOKEN: undefined,
    },
  };
});

import LAYERS from "./default_layers";

describe("default layers", () => {
  it("only offers token-free OpenFreeMap styles", () => {
    expect(Object.keys(LAYERS)).toEqual([
      "POSITRON",
      "BRIGHT",
      "LIBERTY",
      "DARK",
      "FIORD",
    ]);

    for (const layer of Object.values(LAYERS)) {
      expect(layer.type).toBe("STYLE");
      expect(layer.url).toMatch(
        /^https:\/\/tiles\.openfreemap\.org\/styles\/[a-z]+$/,
      );
      expect(layer).not.toHaveProperty("token");
    }
  });
});
