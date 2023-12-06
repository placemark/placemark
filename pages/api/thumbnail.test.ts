import { expect, vi, test } from "vitest";

import createWrappedFeatureCollection from "app/wrappedFeatureCollections/mutations/createWrappedFeatureCollection";
import { getRandomMockCtxAndUser, nanoid } from "test/shared";
import { thumbnailInner } from "./thumbnail";
import { putFeaturesContent, putPresenceContent } from "test/helpers";
import { SimplifiedAuthenticatedSessionContext } from "app/lib/replicache/validations";
import { replicachePushInner } from "./replicache-push";
import { v1 } from "uuid";

vi.mock("integrations/log", () => {
  return {
    logger: {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    },
  };
});

test("thumbnail", async () => {
  const { user, ctx } = await getRandomMockCtxAndUser();
  const wrappedFeatureCollectionId = await createWrappedFeatureCollection(
    { name: "Foo" },
    ctx
  );

  await expect(
    thumbnailInner({
      id: wrappedFeatureCollectionId,
      darkMode: "false",
    })
  ).resolves.toMatchInlineSnapshot(
    `"https://api.mapbox.com/styles/v1/mapbox/light-v10/static/[-180,-85,180,85]/600x400?access_token=pk.eyJ1IjoidG1jdyIsImEiOiJja2twd25qdWowMXBuMnVxdDZodXJzaDZoIn0.UL4e2OtC7xrGr9hohU1odg&attribution=false&logo=false&padding=5"`
  );

  const clientID = nanoid();

  await expect(
    replicachePushInner(
      wrappedFeatureCollectionId,
      {
        clientID,
        schemaVersion: "0.0.0",
        pushVersion: 0,
        mutations: [
          putPresenceContent(1, user.id, wrappedFeatureCollectionId),
          putFeaturesContent(2, wrappedFeatureCollectionId, v1()),
        ],
      },
      ctx.session as SimplifiedAuthenticatedSessionContext
    )
  ).resolves.toEqualRight(true);

  const url = await thumbnailInner({
    id: wrappedFeatureCollectionId,
    darkMode: "false",
  });

  expect(url).toMatchInlineSnapshot(
    '"https://api.mapbox.com/styles/v1/mapbox/light-v10/static/geojson(%7B%22type%22%3A%22FeatureCollection%22%2C%22features%22%3A%5B%7B%22type%22%3A%22Feature%22%2C%22geometry%22%3A%7B%22type%22%3A%22MultiPoint%22%2C%22coordinates%22%3A%5B%5B-123.1638%2C49.2733%5D%5D%7D%2C%22properties%22%3Anull%7D%5D%7D)/[-125.163848,47.273348,-121.163848,51.273348]/600x400?access_token=pk.eyJ1IjoidG1jdyIsImEiOiJja2twd25qdWowMXBuMnVxdDZodXJzaDZoIn0.UL4e2OtC7xrGr9hohU1odg&attribution=false&logo=false&padding=5"'
  );
});
