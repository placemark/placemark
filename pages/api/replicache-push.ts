import { SessionContext } from "@blitzjs/auth";
import { getPokeBackend } from "pages/api/poke";
import { pushRequestValidator } from "app/lib/replicache/validations";
import type {
  IPushRequest,
  SimplifiedAuthenticatedSessionContext,
} from "app/lib/replicache/validations";
import * as Sentry from "@sentry/nextjs";
import type { ContextBall } from "app/lib/replicache/validation_utils";
import { mutators } from "app/lib/replicache/server/mutators";
import { Query } from "app/lib/replicache/api_utils";
import { logger } from "integrations/log";
import type { Either } from "purify-ts/Either";
import { Left, Right } from "purify-ts/Either";
import { createSkipSet } from "app/lib/create_skip_set";
import { pool } from "integrations/pg";
import { AuthorizationError } from "blitz";
import { api } from "app/blitz-server";

async function runMutation(
  mutation: IPushRequest["mutations"][number],
  contextBall: ContextBall
) {
  switch (mutation.name) {
    case "putFolders":
      await mutators.putFolders(mutation.args, contextBall);
      break;
    case "deleteFolders":
      await mutators.deleteFolders(mutation.args, contextBall);
      break;
    case "deleteFeatures":
      await mutators.deleteFeatures(mutation.args, contextBall);
      break;
    case "putFeatures":
      await mutators.putFeatures(mutation.args, contextBall);
      break;
    case "putPresence":
      await mutators.putPresence(mutation.args, contextBall);
      break;
    case "putLayerConfigs":
      await mutators.putLayerConfigs(mutation.args, contextBall);
      break;
    case "deleteLayerConfigs":
      await mutators.deleteLayerConfigs(mutation.args, contextBall);
      break;
  }
}

export async function replicachePushInner(
  wrappedFeatureCollectionId: string,
  push: IPushRequest,
  session: SimplifiedAuthenticatedSessionContext
): Promise<Either<AuthorizationError, boolean>> {
  logger.info("push/start", {
    mutationsLength: push.mutations.length,
    schemaVersion: push.schemaVersion,
    pushVersion: push.pushVersion,
    clientID: push.clientID,
    wrappedFeatureCollectionId: wrappedFeatureCollectionId,
  });

  const client = await pool.connect();

  try {
    const affectedFeatureCollections = new Set(
      push.mutations.map((mutation) => {
        return mutation.args.wrappedFeatureCollectionId;
      })
    );

    if (affectedFeatureCollections.size > 1) {
      throw new AuthorizationError(
        "Only one feature collection should be affected at once"
      );
    }

    const [targetCollection] = affectedFeatureCollections;

    const permission = await client.query(
      `SELECT id FROM "WrappedFeatureCollection"
                            WHERE id = $1 AND "organizationId" = $2`,
      [targetCollection, session.orgId]
    );

    if (permission.rows.length === 0) {
      throw new AuthorizationError("Tried to access an invalid resource");
    }

    await client.query("BEGIN");
    const {
      rows: [{ version }],
    } = await client.query<{ version: number }>(
      `INSERT INTO "ReplicacheVersionSingleton" (id, version) VALUES (0, 0) ON CONFLICT (id) DO UPDATE SET version = "ReplicacheVersionSingleton".version + 1 RETURNING version;`
    );

    const replicacheClientResult = await client.query<{
      lastMutationId: number;
    }>(
      `INSERT INTO "ReplicacheClient" (id, "userId", "updatedAt", "lastMutationId") VALUES ($1, $2, NOW(), 0) ON CONFLICT (id) DO UPDATE SET "updatedAt" = EXCLUDED."updatedAt" RETURNING "lastMutationId";`,
      [push.clientID, session.userId]
    );

    let lastMutationId = replicacheClientResult.rows[0].lastMutationId;

    const skips = createSkipSet(push.mutations);

    let skippedMutations = 0;
    let alreadyProcessed = 0;
    let futureMutations = 0;

    for (const mutation of push.mutations) {
      const expectedMutationID = lastMutationId + 1;

      if (mutation.id < expectedMutationID) {
        // Already processed
        alreadyProcessed++;
        continue;
      }
      if (mutation.id > expectedMutationID) {
        // Future
        futureMutations++;
        break;
      }

      const contextBall: ContextBall = {
        session,
        version,
        client,
        clientID: push.clientID,
      };

      // TODO: use the object mapping directly once i can
      // figure out how to get typescript to allow that.
      if (!skips.has(mutation)) {
        await runMutation(mutation, contextBall);
      } else {
        skippedMutations++;
      }

      lastMutationId = expectedMutationID;
    }

    await client.query(
      `UPDATE "ReplicacheClient" SET "lastMutationId" = $1 WHERE id = $2`,
      [lastMutationId, push.clientID]
    );

    await client.query("COMMIT");
    logger.info("push/end", {
      skippedMutations,
      skipsAvailable: skips.size,
      lastMutationId,
      alreadyProcessed,
      futureMutations,
    });
    return Right(true);
  } catch (e: any) {
    await client.query("ROLLBACK");
    logger.error(e);
    return Left(e);
  } finally {
    client.release();
    // Pass
  }
}

/**
 * Pusher sends a `poke` websocket method to all users.
 * This part will not scale in the long term: any action
 * by any user is broadcast to all users. Instead, we should
 * be selectively sending messages.
 */
function sendPoke(wrappedFeatureCollectionId: string) {
  try {
    const pokeBackend = getPokeBackend();
    pokeBackend.poke(wrappedFeatureCollectionId);
  } catch (e) {
    Sentry.captureException(e);
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "100mb",
    },
    externalResolver: true,
  },
};

export default api(async function replicachePush(req, res, ctx) {
  const session: SessionContext = ctx.session;

  try {
    session.$authorize();
  } catch (e) {
    res.status(401).end();
    return;
  }

  const { wrappedFeatureCollectionId } = Query.parse(req.query);
  const push = pushRequestValidator.parse(req.body);

  (await replicachePushInner(wrappedFeatureCollectionId, push, session)).caseOf(
    {
      Left(e) {
        Sentry.captureException(e);
        res.status(401).end();
        return;
      },
      Right() {
        res.send({});
        sendPoke(wrappedFeatureCollectionId);
      },
    }
  );
});
