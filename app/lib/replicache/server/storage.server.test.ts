import { afterEach, afterAll, beforeEach, expect, describe, it } from "vitest";

import { ServerStorage } from "./storage";
import { newFeatureId } from "app/lib/id";
import { pointFeature, multiPoly2 } from "test/helpers";
import type { AuthenticatedSessionContext } from "@blitzjs/auth";
import db from "db";
import type { PoolClient } from "pg";
import { Pool } from "pg";
import { env } from "app/lib/env_server";
import { ILayerConfig } from "types";
import { randomEmail } from "test/shared";

async function makeFeatureCollection() {
  const id = newFeatureId();
  const user2email = randomEmail();
  const userEmail = randomEmail();
  const user2 = await db.user.create({
    data: {
      name: "John",
      email: user2email,
      memberships: {
        create: {
          role: "OWNER",
          organization: {
            create: {
              name: "Otherteam",
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
  const user = await db.user.create({
    data: {
      name: "Tom",
      email: userEmail,
      memberships: {
        create: {
          role: "OWNER",
          organization: {
            create: {
              name: "My Team",
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
  const wfc = await db.wrappedFeatureCollection.create({
    data: {
      id,
      organizationId: user.memberships[0].organization.id,
      name: "Yes",
    },
  });
  return {
    wrappedFeatureCollectionId: wfc.id,
    orgId: user.memberships[0].organization.id,
    userId: user.id,
    orgId2: user2.memberships[0].organization.id,
    userId2: user2.id,
  };
}

const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

describe("ServerStorage", () => {
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

  it("constructor", () => {
    expect(
      new ServerStorage(
        client,
        0,
        {
          orgId: 42,
          userId: 42,
        } as AuthenticatedSessionContext,
        "0"
      )
    ).toBeTruthy();
  });
  it("putFeature", async () => {
    const { wrappedFeatureCollectionId, userId, orgId } =
      await makeFeatureCollection();
    const s = new ServerStorage(
      client,
      0,
      {
        orgId: orgId,
        userId: userId,
      } as AuthenticatedSessionContext,
      "0"
    );
    await expect(
      s.putFeatures(
        [
          {
            id: newFeatureId(),
            at: "a0",
            folderId: null,
            feature: pointFeature,
          },
        ],
        wrappedFeatureCollectionId
      )
    ).resolves.toBeUndefined();
    const id2 = newFeatureId();
    await expect(
      s.putFeatures(
        [
          {
            id: id2,
            at: "a0",
            folderId: null,
            feature: pointFeature,
          },
        ],
        wrappedFeatureCollectionId
      )
    ).resolves.toBeUndefined();

    await expect(
      s.putFeatures(
        [
          {
            id: id2,
            at: "a0",
            folderId: null,
            feature: multiPoly2,
          },
        ],
        wrappedFeatureCollectionId
      )
    ).resolves.toBeUndefined();
  });

  it("#ensureFeatureCollection", async () => {
    const { wrappedFeatureCollectionId, userId2, orgId2 } =
      await makeFeatureCollection();
    const s = new ServerStorage(
      client,
      0,
      {
        orgId: orgId2,
        userId: userId2,
      } as AuthenticatedSessionContext,
      "0"
    );
    await expect(
      s.enforceFeatureCollection(wrappedFeatureCollectionId)
    ).rejects.toThrowError(/No WrappedFeatureCollection/);
  });

  it("putLayerConfig", async () => {
    const { wrappedFeatureCollectionId, userId, orgId } =
      await makeFeatureCollection();

    const s = new ServerStorage(
      client,
      0,
      {
        orgId: orgId,
        userId: userId,
      } as AuthenticatedSessionContext,
      "0"
    );

    const layerConfig1: ILayerConfig = {
      id: newFeatureId(),
      at: "a0",
      visibility: true,
      opacity: 1,
      url: "https://foo.com/",
      type: "XYZ",
      token: "",
      name: "X",
      tms: false,
    };

    const layerConfig2: ILayerConfig = {
      id: newFeatureId(),
      at: "a1",
      visibility: true,
      opacity: 1,
      url: "https://foo.com/",
      type: "XYZ",
      token: "",
      name: "X",
      tms: false,
    };

    await expect(
      s.putLayerConfigs([layerConfig1], wrappedFeatureCollectionId)
    ).resolves.toBeUndefined();

    await expect(
      db.layerConfig.count({
        where: {
          wrappedFeatureCollectionId: wrappedFeatureCollectionId,
        },
      })
    ).resolves.toEqual(1);

    await expect(
      s.putLayerConfigs([layerConfig2], wrappedFeatureCollectionId)
    ).resolves.toBeUndefined();

    await expect(
      db.layerConfig.count({
        where: {
          wrappedFeatureCollectionId: wrappedFeatureCollectionId,
        },
      })
    ).resolves.toEqual(2);

    await expect(
      db.layerConfig.findMany({
        where: {
          wrappedFeatureCollectionId: wrappedFeatureCollectionId,
          deleted: false,
        },
      })
    ).resolves.toHaveLength(2);

    await expect(
      s.deleteLayerConfigs([layerConfig1.id], wrappedFeatureCollectionId)
    ).resolves.toBeUndefined();

    await expect(
      db.layerConfig.findMany({
        where: {
          wrappedFeatureCollectionId: wrappedFeatureCollectionId,
          deleted: false,
        },
      })
    ).resolves.toHaveLength(1);
  });
});
