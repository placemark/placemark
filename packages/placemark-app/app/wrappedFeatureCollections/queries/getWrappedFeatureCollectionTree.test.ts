import { expect, describe, it } from "vitest";

import createWrappedFeatureCollection from "app/wrappedFeatureCollections/mutations/createWrappedFeatureCollection";
import { getRandomMockCtxAndUser } from "test/shared";
import getWrappedFeatureCollectionTree from "app/wrappedFeatureCollections/queries/getWrappedFeatureCollectionTree";
import createWrappedFeatureCollectionFolder from "app/wrappedFeatureCollectionFolders/mutations/createWrappedFeatureCollectionFolder";

describe("getWrappedFeatureCollections", () => {
  it("returns an empty list by default", async () => {
    const { ctx } = await getRandomMockCtxAndUser();
    await expect(getWrappedFeatureCollectionTree({}, ctx)).resolves
      .toMatchInlineSnapshot(`
      {
        "children": [],
        "type": "root",
      }
    `);
  });

  it("returns a created feature collection", async () => {
    const { ctx } = await getRandomMockCtxAndUser();
    await createWrappedFeatureCollection({ name: "Foo" }, ctx);

    const t = await getWrappedFeatureCollectionTree({}, ctx);
    expect(t).toHaveProperty("type", "root");
    expect(t).toHaveProperty("children");
    expect(t.children).toHaveLength(1);
    expect(t).toHaveProperty(["children", "0", "type"], "leaf");

    const folderId = await createWrappedFeatureCollectionFolder(
      { folderId: null, name: "Foo" },
      ctx
    );

    const t2 = await getWrappedFeatureCollectionTree({}, ctx);
    expect(t2.children).toHaveLength(2);
    expect(t2).toHaveProperty(["children", "1", "type"], "container");

    await createWrappedFeatureCollectionFolder(
      { folderId, name: "Foo chidl" },
      ctx
    );

    const t3 = await getWrappedFeatureCollectionTree({}, ctx);
    expect(t3.children).toHaveLength(2);
    expect(t3).toHaveProperty(
      ["children", "1", "children", "0", "type"],
      "container"
    );
  });
});
