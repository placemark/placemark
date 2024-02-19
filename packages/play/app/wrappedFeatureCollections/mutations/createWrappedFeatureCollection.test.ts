import { expect, describe, it } from "vitest";

import createWrappedFeatureCollection from "./createWrappedFeatureCollection";
import editWrappedFeatureCollection from "./editWrappedFeatureCollection";
import deleteWrappedFeatureCollections from "./deleteWrappedFeatureCollections";
import deleteWrappedFeatureCollectionsAndFolders from "./deleteWrappedFeatureCollectionsAndFolders";
import getWrappedFeatureCollection from "../queries/getWrappedFeatureCollection";
import duplicateWrappedFeatureCollection from "./duplicateWrappedFeatureCollection";
import db from "db";
import { getRandomMockCtxAndUser } from "test/shared";
import { newFeatureId } from "app/lib/id";
import createWrappedFeatureCollectionFolder from "app/wrappedFeatureCollectionFolders/mutations/createWrappedFeatureCollectionFolder";
import combineWrappedFeatureCollections from "app/wrappedFeatureCollections/mutations/combineWrappedFeatureCollections";

describe("createWrappedFeatureCollection mutation", () => {
  it("works correctly", async () => {
    const { user, ctx } = await getRandomMockCtxAndUser();
    // Invoke the mutation
    await createWrappedFeatureCollection({ name: "Foo" }, ctx);

    const wrappedFeatureCollections =
      await db.wrappedFeatureCollection.findMany({
        where: { organizationId: user.memberships[0].organizationId },
      });
    const wfc = wrappedFeatureCollections[0];

    expect(wrappedFeatureCollections).toHaveLength(1);
    expect(wfc.name).toBe("Foo");

    await editWrappedFeatureCollection(
      {
        id: wfc.id,
        name: "Bar",
      },
      ctx
    );

    await expect(
      db.wrappedFeatureCollection.findFirst({
        where: { organizationId: user.memberships[0].organizationId },
      })
    ).resolves.toHaveProperty("name", "Bar");

    const wrappedFeatureId = newFeatureId();
    await db.wrappedFeature.create({
      data: {
        at: "a0",
        id: wrappedFeatureId,
        wrappedFeatureCollectionId: wfc.id,
        version: 1,
        deleted: false,
        feature: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Point",
            coordinates: [42, 4],
          },
        },
      },
    });

    await editWrappedFeatureCollection(
      {
        id: wfc.id,
      },
      ctx
    );

    await deleteWrappedFeatureCollections(
      {
        ids: [wfc.id],
      },
      ctx
    );
  });

  it("combineWrappedFeatureCollections", async () => {
    const { ctx } = await getRandomMockCtxAndUser();
    const folderId = await createWrappedFeatureCollectionFolder(
      { name: "Foo", folderId: null },
      ctx
    );
    // Invoke the mutation
    const a = await createWrappedFeatureCollection(
      { name: "Foo", folderId: folderId },
      ctx
    );
    const b = await createWrappedFeatureCollection({ name: "Foo bar" }, ctx);

    const res = await combineWrappedFeatureCollections(
      {
        ids: [a, b],
      },
      ctx
    );

    expect(res).toBeTypeOf("string");

    const combined = await getWrappedFeatureCollection({ id: res }, ctx);

    expect(combined).toHaveProperty(
      "wrappedFeatureCollectionFolderId",
      folderId
    );

    const configs = await db.layerConfig.findMany({
      where: { wrappedFeatureCollectionId: res },
    });
    expect(configs).toHaveLength(1);
  });

  it("deleteWrappedFeatureCollectionsAndFolders", async () => {
    const { ctx } = await getRandomMockCtxAndUser();
    // Invoke the mutation
    const wfcId = await createWrappedFeatureCollection({ name: "Foo" }, ctx);
    const folderId = await createWrappedFeatureCollectionFolder(
      { name: "Foo", folderId: null },
      ctx
    );

    await expect(
      deleteWrappedFeatureCollectionsAndFolders(
        {
          ids: [wfcId, folderId],
        },
        ctx
      )
    ).resolves.toBeTruthy();
  });

  it("duplicateWrappedFeatureCollection", async () => {
    const { ctx } = await getRandomMockCtxAndUser();
    // Invoke the mutation
    const sourceId = await createWrappedFeatureCollection({ name: "Foo" }, ctx);

    const folderId = newFeatureId();
    await db.folder.create({
      data: {
        at: "a0",
        id: folderId,
        wrappedFeatureCollectionId: sourceId,
        version: 1,
        deleted: false,
      },
    });

    const subFolderId = newFeatureId();
    await db.folder.create({
      data: {
        at: "a0",
        id: subFolderId,
        folderId: folderId,
        wrappedFeatureCollectionId: sourceId,
        version: 1,
        deleted: false,
      },
    });

    const feature = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [42, 4],
      },
    } as const;

    await db.wrappedFeature.createMany({
      data: [
        {
          at: "a0",
          id: newFeatureId(),
          wrappedFeatureCollectionId: sourceId,
          version: 1,
          deleted: false,
          feature,
        },
        {
          at: "a1",
          id: newFeatureId(),
          wrappedFeatureCollectionId: sourceId,
          folderId: folderId,
          version: 1,
          deleted: false,
          feature,
        },
        {
          at: "a2",
          id: newFeatureId(),
          wrappedFeatureCollectionId: sourceId,
          folderId: subFolderId,
          version: 1,
          deleted: false,
          feature,
        },
      ],
    });

    const newId = await duplicateWrappedFeatureCollection(
      {
        id: sourceId,
      },
      ctx
    );

    const duplicated = await getWrappedFeatureCollection({ id: newId }, ctx);
    expect(duplicated).toHaveProperty("name", "Foo (copy)");

    const duplicatedFeatures = await db.wrappedFeature.findMany({
      where: {
        wrappedFeatureCollectionId: newId,
      },
    });

    expect(duplicatedFeatures).toHaveLength(3);
    expect(duplicatedFeatures).toHaveProperty(["0", "at"], "a0");

    const duplicatedFolders = await db.folder.findMany({
      where: {
        wrappedFeatureCollectionId: newId,
      },
    });

    expect(duplicatedFolders).toHaveLength(2);
  });
});
