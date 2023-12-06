import type { IStorage } from "app/lib/replicache/istorage";
import type { IFolder, ILayerConfig, IPresence, IWrappedFeature } from "types";
import type { PoolClient } from "pg";
import zip from "lodash/zip";
import chunk from "lodash/chunk";
import type { SimplifiedAuthenticatedSessionContext } from "../validations";

/**
 * To avoid single blocking large, possibly memory-hungry
 * queries, split large inserts into chunks.
 */
const INSERT_CHUNK_SIZE = 500;

export class ServerStorage implements IStorage {
  private client: PoolClient;
  private version: number;
  private session: SimplifiedAuthenticatedSessionContext;
  private clientID: string;
  private allowedWrappedFeatureCollections: Set<string>;

  constructor(
    client: PoolClient,
    version: number,
    session: SimplifiedAuthenticatedSessionContext,
    clientID: string
  ) {
    this.allowedWrappedFeatureCollections = new Set();
    this.client = client;
    this.version = version;
    this.session = session;
    this.clientID = clientID;
  }

  async deleteFolders(ids: string[], wrappedFeatureCollectionId: string) {
    await this.client.query(
      `UPDATE "Folder" SET
      version = $1,
      "updatedAt" = NOW(),
      deleted = true
      WHERE
      id = ANY ($2::uuid[]) AND
      "wrappedFeatureCollectionId" = $3`,
      [this.version, ids, wrappedFeatureCollectionId]
    );

    await this.client.query(
      `UPDATE "WrappedFeature" SET
      version = $1,
      "updatedAt" = NOW(),
      "folderId" = NULL
      WHERE
      "folderId" = ANY ($2::uuid[]) AND
      "wrappedFeatureCollectionId" = $3`,
      [this.version, ids, wrappedFeatureCollectionId]
    );
  }

  private async isValid(folder: IFolder) {
    let { folderId } = folder;
    const { id } = folder;
    // console.log("checking validity", folderId, id);
    // Folder can not be its own parent
    if (id === folderId) {
      // console.log("Rejected folder input because folderId === id");
      return false;
    }

    while (folderId) {
      // This folder is not nested.
      if (!folderId) {
        // console.log(
        //  "Accepted folder input because folderId was initially blank"
        //);
        return true;
      }
      // Get the folder’s parent's parent
      const { rows } = await this.client.query<{
        folderId: string | null;
      }>(`SELECT "folderId" FROM "Folder" WHERE "Folder"."id" = $1::uuid`, [
        folderId,
      ]);
      if (!rows.length) {
        // console.log("Accepted folder input because no rows", folderId);
        return true;
      }
      folderId = rows[0].folderId;
      if (folderId === id) {
        // console.log(
        //   "Rejected folder input because folderId = id (cycle detected)",
        //   id,
        //   folderId
        // );
        return false;
      }
    }
    // console.log("Allowed folder input by reaching the top of the tree.");
    return true;
  }

  async putFolders(
    folders: IFolder[],
    wrappedFeatureCollectionId: string
  ): Promise<void> {
    await this.enforceFeatureCollection(wrappedFeatureCollectionId);

    const now = new Date();

    const args = await Promise.all(
      folders.map(async (folder) => {
        let { folderId } = folder;

        if (!(await this.isValid(folder))) {
          folderId = null;
        }

        return [
          this.version,
          wrappedFeatureCollectionId,
          folder.id,
          false,
          now,
          folder.name,
          folder.visibility,
          folder.at,
          folderId,
          folder.expanded,
          folder.locked,
          this.session.userId,
        ] as const;
      })
    );

    await this.client.query(
      `INSERT INTO "Folder"
      (version, "wrappedFeatureCollectionId", id, deleted, "updatedAt", name, visibility, at, "folderId", expanded, locked, "createdById")
      SELECT * from UNNEST
      ($1::int[], $2::text[], $3::uuid[], $4::boolean[], $5::timestamp[], $6::text[], $7::boolean[], $8::text[], $9::uuid[], $10::boolean[], $11::boolean[], $12::int[])
      ON CONFLICT (id)
      DO UPDATE SET
      version = EXCLUDED.version,
      deleted = EXCLUDED.deleted,
      name = EXCLUDED.name,
      visibility = EXCLUDED.visibility,
      at = EXCLUDED.at,
      "folderId" = EXCLUDED."folderId",
      "expanded" = EXCLUDED."expanded",
      "locked" = EXCLUDED."locked",
      "updatedAt" = EXCLUDED."updatedAt"
      `,
      zip(...args)
    );

    return;
  }

  async deleteFeatures(ids: string[], wrappedFeatureCollectionId: string) {
    await this.enforceFeatureCollection(wrappedFeatureCollectionId);
    await this.client.query(
      `UPDATE "WrappedFeature" SET
      version = $1,
      "updatedAt" = NOW(),
      deleted = true
      WHERE
      id = ANY ($2::uuid[]) AND
      "wrappedFeatureCollectionId" = $3`,
      [this.version, ids, wrappedFeatureCollectionId]
    );
  }

  async putPresence(
    presence: Omit<IPresence, "replicacheClientId" | "updatedAt">
  ): Promise<void> {
    const {
      pitch,
      bearing,
      minx,
      miny,
      maxx,
      maxy,
      cursorLongitude,
      cursorLatitude,
      wrappedFeatureCollectionId,
    } = presence;

    await this.client.query(
      `INSERT INTO "Presence" (
      pitch,
      bearing,
      minx,
      miny,
      maxx,
      maxy,
      "cursorLongitude",
      "cursorLatitude",
      "wrappedFeatureCollectionId",
      "replicacheClientId",
      version,
      "updatedAt"
      )
      VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      ON CONFLICT ("replicacheClientId") DO UPDATE
      SET
      pitch             = EXCLUDED.pitch,
      bearing           = EXCLUDED.bearing,
      minx              = EXCLUDED.minx,
      miny              = EXCLUDED.miny,
      maxx              = EXCLUDED.maxx,
      maxy              = EXCLUDED.maxy,
      "cursorLongitude" = EXCLUDED."cursorLongitude",
      "cursorLatitude"  = EXCLUDED."cursorLatitude",
      version           = EXCLUDED.version,
      "updatedAt"       = EXCLUDED."updatedAt",
      deleted           = false
      `,
      [
        pitch,
        bearing,
        minx,
        miny,
        maxx,
        maxy,
        cursorLongitude,
        cursorLatitude,
        wrappedFeatureCollectionId,
        this.clientID,
        this.version,
      ]
    );

    await this.client.query(
      `UPDATE "Presence" SET version = $1, deleted = true, "updatedAt" = NOW() WHERE "updatedAt" < (NOW() - INTERVAL '5 minutes') AND deleted = FALSE;`,
      [this.version]
    );

    return;
  }

  /**
   * Does not enforce: expect check before this.
   * Put a feature in the datastore. This validates the feature.
   */
  async putFeatures(
    wrappedFeatures: IWrappedFeature[],
    wrappedFeatureCollectionId: string
  ): Promise<void> {
    await this.enforceFeatureCollection(wrappedFeatureCollectionId);

    const now = new Date();

    const args = wrappedFeatures.map((wrappedFeature) => {
      return [
        wrappedFeature.feature as any,
        wrappedFeature.at,
        this.version,
        wrappedFeatureCollectionId,
        wrappedFeature.id,
        this.session.userId,
        false,
        now,
        wrappedFeature.folderId || null,
      ] as const;
    });

    const batches = chunk(args, INSERT_CHUNK_SIZE);
    for (const batch of batches) {
      await this.client.query(
        `INSERT INTO "WrappedFeature"
      (feature, at, version, "wrappedFeatureCollectionId", id, "createdById", deleted, "updatedAt", "folderId")
      SELECT * from UNNEST
      ($1::jsonb[], $2::text[], $3::int[], $4::text[], $5::uuid[], $6::int[], $7::boolean[], $8::timestamp[], $9::uuid[])
      ON CONFLICT (id)
      DO UPDATE SET
      feature = EXCLUDED.feature,
      at = EXCLUDED.at,
      version = EXCLUDED.version,
      deleted = EXCLUDED.deleted,
      "folderId" = EXCLUDED."folderId",
      "updatedAt" = EXCLUDED."updatedAt"
      `,
        zip(...batch)
      );
    }

    return;
  }

  async enforceFeatureCollection(wrappedFeatureCollectionId: string) {
    if (this.allowedWrappedFeatureCollections.has(wrappedFeatureCollectionId)) {
      // Don't waste time re-checking this condition during a mutation: if you
      // have access to a feature collection, you'll have it for at least this
      // transaction.
      return;
    }

    const { rows } = await this.client.query(
      `SELECT id FROM "WrappedFeatureCollection"
                            WHERE id = $1 AND "organizationId" = $2`,
      [wrappedFeatureCollectionId, this.session.orgId]
    );

    if (!rows.length) {
      throw new Error("No WrappedFeatureCollection found");
    } else {
      this.allowedWrappedFeatureCollections.add(wrappedFeatureCollectionId);
    }
  }

  async putLayerConfigs(
    layerConfigs: ILayerConfig[],
    wrappedFeatureCollectionId: string
  ): Promise<void> {
    await this.enforceFeatureCollection(wrappedFeatureCollectionId);

    const now = new Date();

    const args = await Promise.all(
      layerConfigs.map((layerConfig) => {
        return [
          this.version,
          wrappedFeatureCollectionId,
          layerConfig.id,
          false, // deleted
          now, // updatedAt
          layerConfig.opacity,
          layerConfig.visibility,
          layerConfig.at,
          layerConfig.url,
          layerConfig.type,
          layerConfig.name,
          layerConfig.token,
          layerConfig.tms,
        ] as const;
      })
    );

    await this.client.query(
      `INSERT INTO "LayerConfig"
      (version,   "wrappedFeatureCollectionId", id,         deleted,       "updatedAt",     opacity,    visibility,     at,        url,         type,                     name,        token,       tms)
      SELECT * from UNNEST
      ($1::int[], $2::text[],                   $3::uuid[], $4::boolean[], $5::timestamp[], $6::float[], $7::boolean[], $8::text[], $9::text[], $10::"MapboxLayerType"[], $11::text[], $12::text[], $13::boolean[])
      ON CONFLICT (id)
      DO UPDATE SET

      version = EXCLUDED.version,
      url = EXCLUDED.url,
      type = EXCLUDED.type,
      deleted = EXCLUDED.deleted,
      name = EXCLUDED.name,
      opacity = EXCLUDED.opacity,
      visibility = EXCLUDED.visibility,
      at = EXCLUDED.at,
      "updatedAt" = EXCLUDED."updatedAt",
      "tms" = EXCLUDED."tms",
      "token" = EXCLUDED."token"

      `,
      zip(...args)
    );

    return;
  }

  async deleteLayerConfigs(ids: string[], wrappedFeatureCollectionId: string) {
    await this.enforceFeatureCollection(wrappedFeatureCollectionId);
    await this.client.query(
      `UPDATE "LayerConfig" SET
      version = $1,
      "updatedAt" = NOW(),
      deleted = true
      WHERE
      id = ANY ($2::uuid[]) AND
      "wrappedFeatureCollectionId" = $3`,
      [this.version, ids, wrappedFeatureCollectionId]
    );
  }
}
