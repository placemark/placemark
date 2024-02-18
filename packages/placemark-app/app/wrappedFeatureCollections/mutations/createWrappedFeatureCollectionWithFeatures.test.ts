import { expect, describe, it } from "vitest";

import createWrappedFeatureCollectionWithFeatures from "./createWrappedFeatureCollectionWithFeatures";
import getWrappedFeatureCollection from "../queries/getWrappedFeatureCollection";
import db from "db";
import { getRandomMockCtxAndUser } from "test/shared";
import { v1 } from "uuid";

describe("createWrappedFeatureCollectionWithFeatures mutation", () => {
  it("no features or folders", async () => {
    const { ctx } = await getRandomMockCtxAndUser();
    // Invoke the mutation
    const id = await createWrappedFeatureCollectionWithFeatures(
      { name: "Foo", wrappedFeatures: [], folders: [] },
      ctx
    );
    const newCollection = await getWrappedFeatureCollection({ id }, ctx);
    expect(newCollection).toHaveProperty("name", "Foo");
  });

  it("single folder", async () => {
    const { ctx } = await getRandomMockCtxAndUser();
    // Invoke the mutation
    const id = await createWrappedFeatureCollectionWithFeatures(
      {
        name: "Foo",
        wrappedFeatures: [],
        folders: [
          {
            id: v1(),
            name: "X",
            expanded: true,
            visibility: true,
            locked: true,
            folderId: null,
            at: "a0",
          },
        ],
      },
      ctx
    );
    await expect(
      db.folder.count({ where: { wrappedFeatureCollectionId: id } })
    ).resolves.toEqual(1);
  });

  it("feature in a folder", async () => {
    const { ctx } = await getRandomMockCtxAndUser();
    // Invoke the mutation
    const folderId = v1();
    const id = await createWrappedFeatureCollectionWithFeatures(
      {
        name: "Foo",
        wrappedFeatures: [
          {
            id: v1(),
            feature: {
              type: "Feature",
              properties: {},
              geometry: null,
            },
            at: "a0",
            folderId: folderId,
          },
        ],
        folders: [
          {
            id: folderId,
            name: "X",
            expanded: true,
            visibility: true,
            locked: true,
            folderId: null,
            at: "a0",
          },
        ],
      },
      ctx
    );
    await expect(
      db.folder.count({ where: { wrappedFeatureCollectionId: id } })
    ).resolves.toEqual(1);
    await expect(
      db.wrappedFeature.count({ where: { wrappedFeatureCollectionId: id } })
    ).resolves.toEqual(1);
  });
});
