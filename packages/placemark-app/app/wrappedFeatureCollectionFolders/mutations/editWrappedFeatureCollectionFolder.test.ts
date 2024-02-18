import { expect, describe, it } from "vitest";

import createWrappedFeatureCollectionFolder from "app/wrappedFeatureCollectionFolders/mutations/createWrappedFeatureCollectionFolder";
import { getRandomMockCtxAndUser } from "test/shared";
import { validate } from "uuid";
import editWrappedFeatureCollectionFolder from "app/wrappedFeatureCollectionFolders/mutations/editWrappedFeatureCollectionFolder";
import getWrappedFeatureCollectionTree from "app/wrappedFeatureCollections/queries/getWrappedFeatureCollectionTree";

describe("getWrappedFeatureCollection", () => {
  it("returns a created feature collection", async () => {
    const { ctx } = await getRandomMockCtxAndUser();
    const id = await createWrappedFeatureCollectionFolder(
      { name: "Foo", folderId: null },
      ctx
    );
    expect(id).toBeTypeOf("string");
    expect(validate(id)).toBeTruthy();

    await expect(
      getWrappedFeatureCollectionTree({}, ctx)
    ).resolves.toHaveProperty(["children", "0", "data", "name"], "Foo");

    const edited = await editWrappedFeatureCollectionFolder(
      {
        id,
        name: "X",
        folderId: null,
      },
      ctx
    );

    expect(edited).toBeTypeOf("string");
    await expect(
      getWrappedFeatureCollectionTree({}, ctx)
    ).resolves.toHaveProperty(["children", "0", "data", "name"], "X");
  });
});
