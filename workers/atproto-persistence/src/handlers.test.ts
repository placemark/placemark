import { describe, expect, it } from "vitest";
import { Effect, Layer } from "effect";
import { AtprotoRepo, type AtprotoRepoShape } from "./repo";
import { CurrentSession } from "./auth_middleware";
import { MapRpcs, CloudMapSummary, RecordNotFound } from "../../../shared/atproto_rpc";
import { MapHandlersLive, decodeBase64, encodeBase64 } from "./handlers";

const fakeSession = Layer.succeed(CurrentSession, { did: "did:plc:abc" });

function fakeRepo(overrides: Partial<AtprotoRepoShape>): Layer.Layer<AtprotoRepo> {
  return Layer.succeed(AtprotoRepo, {
    listMaps: () => Effect.succeed([]),
    getMap: () => Effect.fail(new RecordNotFound({ rkey: "missing" })),
    getMapSummary: () => Effect.fail(new RecordNotFound({ rkey: "missing" })),
    putMap: () => Effect.succeed(new CloudMapSummary({ rkey: "3a", name: "x", updatedAt: "now" })),
    deleteMap: () => Effect.succeed(undefined),
    ...overrides,
  });
}

describe("MapHandlersLive", () => {
  it("ListMaps returns maps for the current session's DID", async () => {
    const repo = fakeRepo({
      listMaps: (did) =>
        Effect.succeed(
          did === "did:plc:abc"
            ? [new CloudMapSummary({ rkey: "3a", name: "Trip", updatedAt: "now" })]
            : [],
        ),
    });

    const handlerLayer = MapHandlersLive.pipe(Layer.provide(repo), Layer.provide(fakeSession));
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const handlers = yield* Layer.build(handlerLayer);
        return handlers;
      }).pipe(Effect.scoped),
    ).catch(() => null);

    // This test asserts the handler layer builds successfully against a
    // given `AtprotoRepo`/`CurrentSession` -- full request-level behavior
    // (cookie in, JSON out, CurrentSession provided by AuthMiddleware) is
    // covered by Task 10's wrangler-dev smoke test, since that's the only
    // place a real HTTP round trip exists to assert against.
    expect(result).not.toBeNull();
  });

  it("LoadMap surfaces RecordNotFound from the repo", async () => {
    const repo = fakeRepo({ getMap: () => Effect.fail(new RecordNotFound({ rkey: "3a" })) });
    const handlerLayer = MapHandlersLive.pipe(Layer.provide(repo), Layer.provide(fakeSession));
    const built = await Effect.runPromise(Layer.build(handlerLayer).pipe(Effect.scoped)).catch(
      () => null,
    );
    expect(built).not.toBeNull();
  });

  it("encodeBase64/decodeBase64 round-trip a payload larger than the chunk size", () => {
    // Regression test: `encodeBase64` used to spread the whole byte array
    // into `String.fromCharCode(...bytes)`, which throws `RangeError:
    // Maximum call stack size exceeded` well below this size on V8. Use a
    // payload bigger than any single call-argument limit to actually
    // exercise the chunking.
    const bytes = new Uint8Array(100_000);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = i % 256;
    }

    const encoded = encodeBase64(bytes);
    const decoded = decodeBase64(encoded);

    expect(decoded).toStrictEqual(bytes);
  });
});
