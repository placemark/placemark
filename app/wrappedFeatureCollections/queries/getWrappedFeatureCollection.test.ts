import { expect, describe, it } from "vitest";

import getWrappedFeatureCollection from "./getWrappedFeatureCollection";
import createWrappedFeatureCollection from "app/wrappedFeatureCollections/mutations/createWrappedFeatureCollection";
import { getRandomMockCtxAndUser } from "test/shared";

describe("getWrappedFeatureCollection", () => {
  it("returns a created feature collection", async () => {
    const { ctx } = await getRandomMockCtxAndUser();
    const newCollection = await createWrappedFeatureCollection(
      { name: "Foo" },
      ctx
    );
    await expect(
      getWrappedFeatureCollection(
        {
          id: newCollection,
        },
        ctx
      )
    ).resolves.toMatchObject({
      name: "Foo",
    });
  });
});
