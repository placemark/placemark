import { Effect, Result } from "effect";
import { Base64 } from "effect/encoding";
import { AtprotoRepo, mapRecordToDocument } from "./repo";
import { CurrentSession } from "./auth_middleware";
import { buildActorResolver } from "./identity";
import { CloudMapDocument, MapRpcs } from "../../../shared/atproto_rpc";

// Built once per worker isolate, not per request -- the resolver caches
// DID-document/handle lookups internally, same instance shape already
// used for the OAuth flow's identifier resolution (see oauth.ts).
const actorResolver = buildActorResolver();

export const MapHandlersLive = MapRpcs.toLayer(
  Effect.gen(function* () {
    const repo = yield* AtprotoRepo;

    return {
      Me: () =>
        Effect.gen(function* () {
          const session = yield* CurrentSession;
          // The session only carries the DID (see CurrentSessionShape);
          // resolve it to the handle the user actually recognizes.
          // Falls back to the DID if resolution fails so a flaky
          // handle/DID-doc lookup never breaks sign-in status.
          const handle = yield* Effect.tryPromise(() =>
            actorResolver.resolve(session.did).then((actor) => actor.handle),
          ).pipe(Effect.orElseSucceed(() => session.did));
          return { did: session.did, handle };
        }),

      ListMaps: () =>
        Effect.gen(function* () {
          const session = yield* CurrentSession;
          return yield* repo.listMaps(session.did);
        }),

      SaveMap: ({ name, doc }) =>
        Effect.gen(function* () {
          const session = yield* CurrentSession;
          const rkey = crypto.randomUUID().replace(/-/g, "").slice(0, 13);
          const bytes = Result.getOrThrow(Base64.decode(doc.dataBase64));
          return yield* repo.putMap(
            session.did,
            rkey,
            {
              name,
              symbolization: doc.symbolization,
              layer: doc.layer,
              folders: doc.folders,
              layerConfigs: doc.layerConfigs,
            },
            bytes,
          );
        }),

      LoadMap: ({ rkey }) =>
        Effect.gen(function* () {
          const session = yield* CurrentSession;
          const record = yield* repo.getMap(session.did, rkey);
          return mapRecordToDocument(record);
        }),

      UpdateMap: ({ rkey, name, doc }) =>
        Effect.gen(function* () {
          const session = yield* CurrentSession;
          const existing = yield* repo.getMapSummary(session.did, rkey);
          const bytes = Result.getOrThrow(Base64.decode(doc.dataBase64));
          return yield* repo.putMap(
            session.did,
            rkey,
            {
              name: name ?? existing.name,
              symbolization: doc.symbolization,
              layer: doc.layer,
              folders: doc.folders,
              layerConfigs: doc.layerConfigs,
            },
            bytes,
          );
        }),

      DeleteMap: ({ rkey }) =>
        Effect.gen(function* () {
          const session = yield* CurrentSession;
          yield* repo.deleteMap(session.did, rkey);
        }),
    };
  }),
);
