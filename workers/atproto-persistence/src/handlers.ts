import { Effect, Result } from "effect";
import { Base64 } from "effect/encoding";
import { AtprotoRepo } from "./repo";
import { CurrentSession } from "./auth_middleware";
import { CloudMapDocument, MapRpcs } from "../../../shared/atproto_rpc";

export const MapHandlersLive = MapRpcs.toLayer(
  Effect.gen(function* () {
    const repo = yield* AtprotoRepo;

    return {
      Me: () =>
        Effect.gen(function* () {
          const session = yield* CurrentSession;
          return { did: session.did, handle: session.did };
        }),

      Logout: () => Effect.succeed(undefined),

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
          return new CloudMapDocument({
            dataBase64: Base64.encode(record.dataBytes),
            symbolization: record.symbolization,
            layer: record.layer,
            folders: record.folders,
            layerConfigs: record.layerConfigs,
          });
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
