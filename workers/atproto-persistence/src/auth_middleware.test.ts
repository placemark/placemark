import { assert, expect, it } from "vitest";
import { Context, Effect, Layer, Result } from "effect";
import { HttpServerRequest } from "effect/http";
import type { OAuthClient, OAuthSession } from "@atcute/oauth-node-client";
import type { Did } from "@atcute/lexicons/syntax";
import { signDidCookie } from "./cookie";
import { CurrentSession, makeSessionLayer } from "./auth_middleware";
import type { AtprotoRepo } from "./repo";
import { Unauthenticated } from "../../../shared/atproto_rpc";

const COOKIE_SECRET = "test-secret";
const DID = "did:plc:abc123";

/**
 * `makeSessionLayer` only ever calls `oauth.restore(did)`, and atcute's
 * client classes can't be satisfied structurally (private fields), so
 * stub just what's called.
 */
function fakeOAuthClient(restore: (did: Did) => Promise<OAuthSession | undefined>): OAuthClient {
  return { restore } as unknown as OAuthClient;
}

/** Minimal `OAuthSession` stand-in: only `handle` is touched, when the
 * `Client` wrapping it is constructed. */
function fakeSession(): OAuthSession {
  return { handle: async () => new Response(null) } as unknown as OAuthSession;
}

const restoringOAuth = (session: OAuthSession | undefined = fakeSession()) =>
  fakeOAuthClient(async () => session);

function requestWithCookie(cookieHeader?: string): HttpServerRequest.HttpServerRequest {
  return HttpServerRequest.fromWeb(
    new Request("https://example.com/rpc", {
      method: "POST",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    }),
  );
}

/** Builds and (scoped-ly) runs `makeSessionLayer`, surfacing the
 * `Unauthenticated` failure value directly. */
function runSessionLayer(
  oauth: OAuthClient,
  request: HttpServerRequest.HttpServerRequest,
): Promise<Result.Result<Context.Context<CurrentSession | AtprotoRepo>, Unauthenticated>> {
  return Effect.runPromise(
    Layer.build(makeSessionLayer(oauth, COOKIE_SECRET)).pipe(
      Effect.provideService(HttpServerRequest.HttpServerRequest, request),
      Effect.scoped,
      Effect.result,
    ),
  );
}

it.for(
  [
    [
      "the pm_session cookie is missing",
      () => restoringOAuth(),
      undefined,
    ],
    [
      "the cookie signature doesn't verify",
      () => restoringOAuth(),
      signDidCookie(DID, "a-different-secret"),
    ],
    [
      "oauth.restore rejects",
      () => fakeOAuthClient(async () => { throw new Error("no such session"); }),
      signDidCookie(DID, COOKIE_SECRET),
    ],
    [
      "oauth.restore resolves falsy",
      () => restoringOAuth(undefined),
      signDidCookie(DID, COOKIE_SECRET),
    ],
  ] as Array<[string, () => OAuthClient, Promise<string> | undefined]>,
)("fails with Unauthenticated when %s", async ([, makeOauth, cookie]) => {
  const result = await runSessionLayer(
    makeOauth(),
    requestWithCookie(cookie ? `pm_session=${cookie}` : undefined),
  );
  assert(Result.isFailure(result));
  expect(result.failure).toStrictEqual(new Unauthenticated({}));
});

it("provides CurrentSession with the cookie's DID once the session restores", async () => {
  const cookie = await signDidCookie(DID, COOKIE_SECRET);
  const result = await runSessionLayer(restoringOAuth(), requestWithCookie(`pm_session=${cookie}`));
  assert(Result.isSuccess(result));
  expect(Context.get(result.success, CurrentSession)).toStrictEqual({ did: DID });
});
