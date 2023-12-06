import { expect, describe, it, vi } from "vitest";

import createWrappedFeatureCollection from "app/wrappedFeatureCollections/mutations/createWrappedFeatureCollection";
import { getRandomMockCtxAndUser, nanoid } from "test/shared";
import db from "db";
import { replicachePushInner } from "./replicache-push";
import { replicachePullInner } from "./replicache-pull";
import getLastPresence from "app/users/queries/getLastPresence";
import getWrappedFeatureCollections from "app/wrappedFeatureCollections/queries/getWrappedFeatureCollections";
import { putFeaturesContent, putPresenceContent } from "test/helpers";
import { SimplifiedAuthenticatedSessionContext } from "app/lib/replicache/validations";
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

describe("push", () => {
  it("base case (error)", async () => {
    await expect(
      replicachePushInner(
        "",
        {
          clientID: "",
          schemaVersion: "0.0.0",
          pushVersion: 0,
          mutations: [],
        },
        {
          userId: 0,
          orgId: 0,
        }
      )
    ).resolves.toBeLeft();
  });

  it("putPresence", async () => {
    const { user, ctx } = await getRandomMockCtxAndUser();
    const wrappedFeatureCollectionId = await createWrappedFeatureCollection(
      { name: "Foo" },
      ctx
    );

    const { version } = await db.replicacheVersionSingleton.findFirstOrThrow();

    const clientID = nanoid();

    await expect(
      getLastPresence({ wrappedFeatureCollectionId }, ctx)
    ).resolves.toEqual(null);

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

    const pull = await replicachePullInner(
      wrappedFeatureCollectionId,
      {
        lastMutationID: 0,
        schemaVersion: "0.0.0",
        clientID,
        pullVersion: 0,
        cookie: null,
      },
      ctx.session as SimplifiedAuthenticatedSessionContext
    );

    expect(pull.cookie).toBeGreaterThan(version);

    await expect(
      getLastPresence({ wrappedFeatureCollectionId }, ctx)
    ).resolves.toHaveProperty("deleted", false);

    const collections = await getWrappedFeatureCollections({}, ctx);
    expect(collections[0]._count.wrappedFeatures).toEqual(1);
  });
});
