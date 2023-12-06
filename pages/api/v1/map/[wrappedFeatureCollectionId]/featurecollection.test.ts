import { expect, vi, test } from "vitest";

import { getRandomMockCtxAndUser, nanoid } from "test/shared";
import db from "db";
import { NIL, v1 } from "uuid";
import { putFeaturesContent, putPresenceContent } from "test/helpers";
import { SimplifiedAuthenticatedSessionContext } from "app/lib/replicache/validations";
import { replicachePushInner } from "pages/api/replicache-push";
import { featureCollectionInner, getEtag } from "./featurecollection";

vi.mock("integrations/log", () => {
  return {
    logger: {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    },
  };
});

test("featureCollectionInner", async () => {
  const { user, ctx } = await getRandomMockCtxAndUser();
  const wrappedFeatureCollectionId = nanoid();

  await db.wrappedFeatureCollection.create({
    data: {
      id: wrappedFeatureCollectionId,
      name: "Foo",
      organization: {
        connect: {
          id: ctx.session.orgId!,
        },
      },

      createdBy: {
        connect: {
          id: ctx.session.userId!,
        },
      },
    },
  });

  await expect(
    getEtag({ wrappedFeatureCollectionId })
  ).resolves.toMatchInlineSnapshot(`null`);
  await expect(featureCollectionInner({ wrappedFeatureCollectionId })).resolves
    .toMatchInlineSnapshot(`
    {
      "features": [],
      "type": "FeatureCollection",
    }
  `);

  await db.wrappedFeatureCollection.update({
    data: {
      access: "PUBLIC",
    },
    where: {
      id: wrappedFeatureCollectionId,
    },
  });
  await expect(
    getEtag({ wrappedFeatureCollectionId })
  ).resolves.toMatchInlineSnapshot(`null`);

  await expect(featureCollectionInner({ wrappedFeatureCollectionId })).resolves
    .toMatchInlineSnapshot(`
    {
      "features": [],
      "type": "FeatureCollection",
    }
  `);

  const clientID = nanoid();

  // const { version } = await db.replicacheVersionSingleton.findFirstOrThrow();

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

  await expect(getEtag({ wrappedFeatureCollectionId })).resolves.toContain(
    `W/"v1`
  );

  const res = (await featureCollectionInner({
    wrappedFeatureCollectionId,
  })) as any;

  delete res.features[0].properties["@id"];

  expect(res).toMatchInlineSnapshot(`
    {
      "features": [
        {
          "geometry": {
            "coordinates": [
              -123.163848,
              49.273348,
            ],
            "type": "Point",
          },
          "properties": {},
          "type": "Feature",
        },
      ],
      "type": "FeatureCollection",
    }
  `);

  const res2 = (await featureCollectionInner({
    wrappedFeatureCollectionId,
    folder: NIL,
  })) as any;

  expect(res2).toMatchInlineSnapshot(`
    {
      "features": [],
      "type": "FeatureCollection",
    }
  `);
});
