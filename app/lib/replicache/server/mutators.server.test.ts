import { afterAll, afterEach, beforeEach, expect, describe, it } from "vitest";

import { mutators } from "./mutators";
import db from "db";
import { nanoid } from "nanoid";
import { newFeatureId } from "app/lib/id";
import type { AuthenticatedSessionContext } from "@blitzjs/auth";
import type { PoolClient } from "pg";
import { Pool } from "pg";
import { env } from "app/lib/env_server";
import { randomEmail, randomStripe } from "test/shared";

const { DATABASE_URL } = env;

async function getCount(id: string) {
  return await db.wrappedFeature
    .aggregate({
      where: {
        wrappedFeatureCollectionId: id,
        deleted: false,
      },
      _count: true,
    })
    .then((r) => r._count);
}

async function makeMocks() {
  const wrappedFeatureCollectionId = nanoid();
  const user = await db.user.create({
    data: {
      name: "Tom",
      email: randomEmail(),
      memberships: {
        create: {
          role: "OWNER",
          organization: {
            create: {
              name: "My Team",
              stripeCustomerId: randomStripe(),
            },
          },
        },
      },
    },
    include: {
      memberships: {
        select: {
          organization: true,
        },
      },
    },
  });
  const orgId = user.memberships[0].organization.id;
  await db.wrappedFeatureCollection.create({
    data: {
      id: wrappedFeatureCollectionId,
      organizationId: orgId,
      name: "Yes",
    },
  });

  const fakeCtx = {
    userId: user.id,
    orgId: orgId,
  } as AuthenticatedSessionContext;

  return {
    session: fakeCtx,
    wrappedFeatureCollectionId,
  };
}

const pool = new Pool({
  connectionString: DATABASE_URL,
});

describe("mutators", () => {
  let client: PoolClient;

  beforeEach(async () => {
    client = await pool.connect();
  });

  afterEach(() => {
    client.release();
  });

  afterAll(async () => {
    await pool.end();
  });
  it("#deleteFeatures", async () => {
    const { wrappedFeatureCollectionId, session } = await makeMocks();
    await expect(
      mutators.deleteFeatures(
        {
          features: [],
          wrappedFeatureCollectionId,
        },
        {
          version: 0,
          client,
          session,
          clientID: "0",
        }
      )
    ).resolves.toEqual(undefined);
  });
  it("#putFeatures", async () => {
    const { wrappedFeatureCollectionId, session } = await makeMocks();

    await expect(
      mutators.putFeatures(
        {
          features: [],
          wrappedFeatureCollectionId,
        },
        {
          version: 0,
          client,
          session,
          clientID: "0",
        }
      )
    ).resolves.toEqual(undefined);

    const id = newFeatureId();
    await expect(
      mutators.putFeatures(
        {
          features: [
            {
              id,
              at: "a0",
              feature: {
                type: "Feature",
                geometry: {
                  type: "Point",
                  coordinates: [0, 0],
                },
                properties: {},
              },
            },
          ],
          wrappedFeatureCollectionId,
        },
        {
          version: 0,
          client,
          session,
          clientID: "0",
        }
      )
    ).resolves.toEqual(undefined);

    await expect(getCount(wrappedFeatureCollectionId)).resolves.toEqual(1);

    await expect(
      mutators.putFeatures(
        {
          features: [],
          wrappedFeatureCollectionId,
        },
        {
          version: 0,
          client,
          session,
          clientID: "0",
        }
      )
    ).resolves.toEqual(undefined);

    await expect(
      mutators.putFeatures(
        {
          features: [
            {
              id,
              at: "a0",
              feature: {
                type: "Feature",
                geometry: {
                  type: "Point",
                  coordinates: [0, 0],
                },
                properties: { x: 1 },
              },
            },
          ],
          wrappedFeatureCollectionId,
        },
        {
          version: 0,
          client,
          session,
          clientID: "0",
        }
      )
    ).resolves.toEqual(undefined);

    await expect(
      db.wrappedFeature.findFirst({ where: { id } })
    ).resolves.toHaveProperty(["feature", "properties"], { x: 1 });

    await expect(
      mutators.deleteFeatures(
        {
          features: [id],
          wrappedFeatureCollectionId,
        },
        {
          version: 1,
          client,
          session,
          clientID: "0",
        }
      )
    ).resolves.toEqual(undefined);

    await expect(getCount(wrappedFeatureCollectionId)).resolves.toEqual(0);
  });
});
