import { Effect } from "effect";
import { Client, simpleFetchHandler } from "@atcute/client";
import { isActorIdentifier, type ActorIdentifier, isRecordKey } from "@atcute/lexicons/syntax";
import type { ActorResolver } from "@atcute/identity-resolver";
import { buildActorResolver } from "./identity";
import { AtprotoRepo, AtprotoRepoLive, mapRecordToDocument } from "./repo";
import { RecordNotFound, SharedMap } from "../../../shared/atproto_rpc";

/**
 * Share links make (owner, rkey) pairs directly loadable by anyone. This
 * works without any new storage or permission layer because atproto repo
 * reads (`com.atproto.repo.getRecord`, `com.atproto.sync.getBlob`) are
 * public protocol operations: every record in a PDS repo is readable by
 * anyone who knows the DID and rkey. The share link adds no exposure;
 * it only adds convenience.
 */

export interface PublicMapParams {
  did: string;
  rkey: string;
}

/** `?did=…&rkey=…`, validated against atproto syntax. */
export function parsePublicMapParams(url: URL): PublicMapParams | null {
  const did = url.searchParams.get("did") ?? "";
  const rkey = url.searchParams.get("rkey") ?? "";
  if (!isActorIdentifier(did) || !isRecordKey(rkey)) {
    return null;
  }
  return { did, rkey };
}

// Narrows a plain string into atcute's branded ActorIdentifier, matching
// repo.ts's approach. fetchSharedMap runs after parsePublicMapParams, so
// this only throws if a future caller skips that validation.
function asActorIdentifier(did: string): ActorIdentifier {
  if (!isActorIdentifier(did)) {
    throw new Error(`not a valid DID or handle: ${did}`);
  }
  return did;
}

/**
 * Fetches a map from its owner's PDS with no session. Reuses
 * AtprotoRepo.getMap -- pointed at an unauthenticated client bound to the
 * owner's PDS -- so a shared load and a signed-in load parse and validate
 * the record identically. Fails with RecordNotFound for a missing record.
 */
export async function fetchSharedMap(
  params: PublicMapParams,
  // Injectable for tests; the default resolves over public PLC /
  // well-known / DoH infrastructure.
  actorResolver: ActorResolver = buildActorResolver(),
): Promise<SharedMap> {
  // resolve() returns { did, handle, pds }; only the PDS endpoint matters
  // here. Throws when the DID doesn't resolve (deleted account, typo).
  const { pds } = await actorResolver.resolve(asActorIdentifier(params.did));

  const client = new Client({ handler: simpleFetchHandler({ service: pds }) });

  return Effect.runPromise(
    Effect.gen(function* () {
      const repo = yield* AtprotoRepo;
      const record = yield* repo.getMap(params.did, params.rkey);
      return new SharedMap({
        name: record.name,
        doc: mapRecordToDocument(record),
      });
    }).pipe(Effect.provide(AtprotoRepoLive(client))),
  );
}

/**
 * GET /public/map?did=…&rkey=… — the read side of share links. Always
 * unauthenticated; index.ts wraps the response in the usual CORS headers
 * so the app can fetch it cross-origin.
 */
export async function handlePublicMap(
  request: Request,
  actorResolver?: ActorResolver,
): Promise<Response> {
  const params = parsePublicMapParams(new URL(request.url));
  if (!params) {
    return Response.json(
      { error: "missing or invalid 'did' and 'rkey' parameters" },
      { status: 400 },
    );
  }

  try {
    const sharedMap = await fetchSharedMap(params, actorResolver);
    // Short public cache: updates stay fresh-ish, and repeat opens of the
    // same link (and hits of a shared link by many people) skip the PDS.
    return Response.json(sharedMap, {
      headers: { "Cache-Control": "public, max-age=60" },
    });
  } catch (error) {
    // Effect.runPromise rejects with the effect's typed error, squashed,
    // so the RecordNotFound that repo.getMap fails with arrives here as
    // itself.
    if (error instanceof RecordNotFound) {
      return Response.json({ error: "RecordNotFound" }, { status: 404 });
    }
    console.error(error);
    return Response.json({ error: "map could not be fetched" }, { status: 502 });
  }
}
