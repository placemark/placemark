import { SessionContext } from "@blitzjs/auth";
import { api } from "app/blitz-server";
import { z } from "zod";
import * as keys from "app/lib/replicache/keys";
import db from "db";
import type {
  Feature,
  IFolder,
  IPresence,
  IWrappedFeature,
  ILayerConfig,
} from "types";
import { Query } from "app/lib/replicache/api_utils";
import { logger } from "integrations/log";
import type { SimplifiedAuthenticatedSessionContext } from "app/lib/replicache/validations";
import { pool } from "integrations/pg";

/**
 * Incoming POST arguments that inform us
 * of how much the client already knows and what version
 * it's on.
 */
const PullRequest = z.object({
  schemaVersion: z.string(),
  clientID: z.string(),
  lastMutationID: z.number(),
  pullVersion: z.number(),
  cookie: z.nullable(z.number()),
});

type Patch =
  | {
      op: "put";
      key: string;
      value: IWrappedFeature | IPresence | IFolder | ILayerConfig;
    }
  | {
      op: "del";
      key: string;
    }
  | {
      op: "clear";
    };

/**
 * Outgoing data updates
 */
interface IPullResponse {
  cookie: number | null;
  lastMutationID: number;
  patch: Patch[];
}

type Db = typeof db;

interface GetterArgs {
  db: Db;
  version: number;
  session: SimplifiedAuthenticatedSessionContext;
  wrappedFeatureCollectionId: string;
  /**
   * If the pull response includes a 'clear' operation,
   * then there will be no pre-existing data on the user's
   * device, so there's no sense in sending 'del' operations,
   * and thus fetching deleted rows.
   * This is an optimization.
   */
  includeDeletes: boolean;
}

const CLEAR: IPullResponse["patch"][0] = {
  op: "clear",
};

async function getLayerConfigs({
  db,
  wrappedFeatureCollectionId,
  // session,
  version,
}: GetterArgs) {
  return (
    await db.layerConfig.findMany({
      where: {
        wrappedFeatureCollectionId: wrappedFeatureCollectionId,
        version: {
          gt: version,
        },
      },
    })
  ).map((row): Patch => {
    const key = keys.layerConfig(row);

    // TODO
    if (row.deleted) {
      return {
        key,
        op: "del",
      };
    }

    return {
      op: "put",
      key,
      value: row,
    };
  });
}

// TODO: enforce scope
async function getFolders({
  db,
  wrappedFeatureCollectionId,
  // session,
  version,
}: GetterArgs) {
  return (
    await db.folder.findMany({
      where: {
        wrappedFeatureCollectionId: wrappedFeatureCollectionId,
        version: {
          gt: version,
        },
      },
    })
  ).map((row): Patch => {
    const key = keys.folder(row);

    // TODO
    if (row.deleted) {
      return {
        key,
        op: "del",
      };
    }

    return {
      op: "put",
      key,
      value: row,
    };
  });
}

// TODO: enforce scope
async function getPresences({
  db,
  wrappedFeatureCollectionId,
  // session,
  version,
}: GetterArgs) {
  return (
    await db.presence.findMany({
      include: {
        replicacheClient: {
          select: {
            user: {
              select: {
                name: true,
                email: true,
                id: true,
              },
            },
          },
        },
      },
      where: {
        wrappedFeatureCollectionId: wrappedFeatureCollectionId,
        version: {
          gt: version,
        },
      },
    })
  ).map((row): Patch => {
    const key = keys.presence(row);

    const {
      replicacheClient: { user },
      updatedAt,
      ...rest
    } = row;

    // TODO
    if (row.deleted) {
      return {
        key,
        op: "del",
      };
    }

    return {
      op: "put",
      key,
      value: {
        ...rest,
        updatedAt: updatedAt.toUTCString(),
        userId: user.id,
        userName: user.name ?? user.email,
      },
    };
  });
}

// TODO: enforce scope
async function getFeatures({
  db,
  wrappedFeatureCollectionId,
  includeDeletes,
  // session,
  version,
}: GetterArgs) {
  const [added, deleted] = await Promise.all([
    db.wrappedFeature.findMany({
      select: {
        feature: true,
        folderId: true,
        at: true,
        id: true,
      },
      orderBy: {
        at: "desc",
      },
      where: {
        wrappedFeatureCollectionId,
        deleted: false,
        version: {
          gt: version,
        },
      },
    }),
    includeDeletes
      ? db.wrappedFeature.findMany({
          select: {
            id: true,
          },
          where: {
            wrappedFeatureCollectionId,
            deleted: true,
            version: {
              gt: version,
            },
          },
        })
      : [],
  ]);

  return [
    ...added.map((row): Patch => {
      const { id } = row;
      const key = keys.feature({
        id,
        wrappedFeatureCollectionId,
      });

      const rawValue: IWrappedFeature = {
        id: row.id,
        // This is not enforced, but all features
        // with NULL at also have deleted = true
        at: row.at!,
        folderId: row.folderId,
        feature: row.feature as unknown as Feature,
      };

      return {
        op: "put",
        key,
        value: rawValue,
      };
    }),
    ...deleted.map((row): Patch => {
      const { id } = row;
      const key = keys.feature({
        id,
        wrappedFeatureCollectionId,
      });

      return {
        key,
        op: "del",
      };
    }),
  ];
}

export async function replicachePullInner(
  wrappedFeatureCollectionId: string,
  pull: z.infer<typeof PullRequest>,
  session: SimplifiedAuthenticatedSessionContext
) {
  const pgClient = await pool.connect();

  try {
    const client = await db.replicacheClient.findUnique({
      where: {
        id: pull.clientID,
      },
    });

    const lastMutationID = client?.lastMutationId ?? 0;
    const version = pull.cookie ?? 0;
    const includeDeletes = pull.cookie !== null;

    const getterArgs: GetterArgs = {
      wrappedFeatureCollectionId,
      db,
      version,
      session,
      includeDeletes,
    };

    const {
      rows: [{ cookie }],
    } = await pgClient.query(
      `SELECT MAX(max) as cookie FROM (
SELECT MAX(version) from "Presence" WHERE "wrappedFeatureCollectionId" = $1
UNION SELECT MAX(version) from "WrappedFeature" WHERE "wrappedFeatureCollectionId" = $1
UNION SELECT MAX(version) from "LayerConfig" WHERE "wrappedFeatureCollectionId" = $1
UNION SELECT MAX(version) from "Folder" WHERE "wrappedFeatureCollectionId" = $1) as m;
`,
      [wrappedFeatureCollectionId]
    );

    const [features, presences, folders, layerConfigs] = await Promise.all([
      getFeatures(getterArgs),
      getPresences(getterArgs),
      getFolders(getterArgs),
      getLayerConfigs(getterArgs),
    ]);

    const pullResponse: IPullResponse = {
      lastMutationID,
      cookie,
      patch: (pull.cookie === null ? [CLEAR] : []).concat(
        features,
        folders,
        presences,
        layerConfigs
      ),
    };

    logger.info("pull/done", {
      patchLength: pullResponse.patch.length,
      pull,
    });

    return pullResponse;
  } finally {
    pgClient.release();
  }
}

export const config = {
  api: {
    externalResolver: true,
  },
};

export default api(async function replicachePull(req, res, ctx) {
  const session: SessionContext = ctx.session;
  session.$authorize();

  const { wrappedFeatureCollectionId } = Query.parse(req.query);
  const pull = PullRequest.parse(req.body);

  const pullResponse = await replicachePullInner(
    wrappedFeatureCollectionId,
    pull,
    session
  );

  res.json(pullResponse);
});
