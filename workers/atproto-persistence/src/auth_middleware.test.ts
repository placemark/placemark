import { describe, expect, it } from "vitest";
import { Context, Effect, Layer, Result } from "effect";
import { HttpServerRequest } from "effect/http";
import type { OAuthClient, OAuthSession } from "@atcute/oauth-node-client";
import type { Did } from "@atcute/lexicons/syntax";
import { signDidCookie } from "./cookie";
import { CurrentSession, makeSessionLayer } from "./auth_middleware";
import { Unauthenticated } from "../../../shared/atproto_rpc";

const COOKIE_SECRET = "test-secret";
const DID = "did:plc:abc123";

/**
 * `makeSessionLayer` only ever calls `oauth.restore(did)` on the `OAuthClient`
 * it's given -- stub just that, matching the precedent `oauth.test.ts` already
 * sets for narrow `as` casts when a real atcute class (with private fields)
 * can't be satisfied structurally by a plain test double.
 */
function fakeOAuthClient(restore: (did: Did) => Promise<OAuthSession>): OAuthClient {
  return { restore } as unknown as OAuthClient;
}

/** A minimal stand-in for a restored `OAuthSession` -- enough to satisfy the
 * `FetchHandlerObject` shape `@atcute/client`'s `Client` constructor actually
 * needs (`handle(pathname, init): Promise<Response>`); nothing in
 * `makeSessionLayer` or `AtprotoRepoLive` calls any other `OAuthSession`
 * member at layer-build time. */
function fakeSession(): OAuthSession {
  return { handle: async () => new Response(null) } as unknown as OAuthSession;
}

function requestWithCookie(cookieHeader?: string): HttpServerRequest.HttpServerRequest {
  return HttpServerRequest.fromWeb(
    new Request("https://example.com/rpc", {
      method: "POST",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    }),
  );
}

/**
 * Builds and (scoped-ly) runs `makeSessionLayer`, returning a `Result` so
 * tests can assert on the `Unauthenticated` failure value directly instead
 * of unwrapping an `Effect` defect `Cause`.
 */
function runSessionLayer(
  oauth: OAuthClient,
  request: HttpServerRequest.HttpServerRequest,
): Promise<Result.Result<Context.Context<CurrentSession>, Unauthenticated>> {
  return Effect.runPromise(
    Layer.build(makeSessionLayer(oauth, COOKIE_SECRET)).pipe(
      Effect.provideService(HttpServerRequest.HttpServerRequest, request),
      Effect.scoped,
      Effect.result,
    ),
  );
}

describe("makeSessionLayer", () => {
  it("fails with Unauthenticated when the pm_session cookie is missing", async () => {
    const oauth = fakeOAuthClient(async () => fakeSession());
    const result = await runSessionLayer(oauth, requestWithCookie(undefined));

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.failure).toStrictEqual(new Unauthenticated({}));
    }
  });

  it("fails with Unauthenticated when the cookie signature doesn't verify", async () => {
    // Signed with a different secret than `makeSessionLayer` is given --
    // `verifyDidCookie` rejects this the same way a tampered value would.
    const cookie = await signDidCookie(DID, "a-different-secret");
    const oauth = fakeOAuthClient(async () => fakeSession());
    const result = await runSessionLayer(oauth, requestWithCookie(`pm_session=${cookie}`));

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.failure).toStrictEqual(new Unauthenticated({}));
    }
  });

  it("fails with Unauthenticated when oauth.restore rejects", async () => {
    const cookie = await signDidCookie(DID, COOKIE_SECRET);
    const oauth = fakeOAuthClient(async () => {
      throw new Error("no such session");
    });
    const result = await runSessionLayer(oauth, requestWithCookie(`pm_session=${cookie}`));

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.failure).toStrictEqual(new Unauthenticated({}));
    }
  });

  it("fails with Unauthenticated when oauth.restore resolves falsy", async () => {
    const cookie = await signDidCookie(DID, COOKIE_SECRET);
    const oauth = {
      // `restore`'s real return type never includes `undefined`, but
      // `makeSessionLayer`'s `!session` check exists specifically to guard
      // against a misbehaving/future implementation returning one anyway.
      restore: async () => undefined,
    } as unknown as OAuthClient;
    const result = await runSessionLayer(oauth, requestWithCookie(`pm_session=${cookie}`));

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.failure).toStrictEqual(new Unauthenticated({}));
    }
  });

  it("succeeds and provides CurrentSession with the cookie's DID when the session restores", async () => {
    const cookie = await signDidCookie(DID, COOKIE_SECRET);
    const oauth = fakeOAuthClient(async () => fakeSession());
    const result = await runSessionLayer(oauth, requestWithCookie(`pm_session=${cookie}`));

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      const session = Context.get(result.success, CurrentSession);
      expect(session).toStrictEqual({ did: DID });
    }
  });
});
