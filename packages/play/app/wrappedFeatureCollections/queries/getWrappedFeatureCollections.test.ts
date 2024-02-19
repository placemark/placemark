import { expect, describe, it, vi } from "vitest";

import getWrappedFeatureCollections from "./getWrappedFeatureCollections";
import createWrappedFeatureCollection from "app/wrappedFeatureCollections/mutations/createWrappedFeatureCollection";
import { getRandomMockCtxAndUser } from "test/shared";

vi.mock("blitz", async () => ({
  ...(await vi.importActual<object>("blitz")),
  generateToken: () => "plain-token",
}));

describe("getWrappedFeatureCollections", () => {
  it("returns an empty list by default", async () => {
    const { ctx } = await getRandomMockCtxAndUser();
    await expect(getWrappedFeatureCollections({}, ctx)).resolves.toEqual([]);
  });

  it("returns a created feature collection", async () => {
    const { ctx } = await getRandomMockCtxAndUser();
    await createWrappedFeatureCollection({ name: "Foo" }, ctx);
    await expect(getWrappedFeatureCollections({}, ctx)).resolves.toMatchObject([
      {
        name: "Foo",
        _count: { wrappedFeatures: 0 },
      },
    ]);
  });
});
