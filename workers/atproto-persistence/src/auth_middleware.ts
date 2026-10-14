import { Context, Effect, Layer } from "effect";
import { HttpServerRequest } from "effect/http";
import { isDid, type Did } from "@atcute/lexicons/syntax";
import { OAuthClient, OAuthSession } from "@atcute/oauth-node-client";
import { Client } from "@atcute/client";
import { Unauthenticated } from "../../../shared/atproto_rpc";
import { verifyDidCookie } from "./cookie";
import { AtprotoRepo, AtprotoRepoLive } from "./repo";

const SESSION_COOKIE_NAME = "pm_session";

export interface CurrentSessionShape {
  readonly did: string;
}

export class CurrentSession extends Context.Service<
  CurrentSession,
  CurrentSessionShape
>()("CurrentSession") {}

function resolveDid(cookieValue: string | undefined, cookieSecret: string): Effect.Effect<Did, Unauthenticated> {
  return Effect.gen(function* () {
    if (!cookieValue) {
      return yield* Effect.fail(new Unauthenticated({}));
    }

    const did = yield* Effect.tryPromise({
      try: () => verifyDidCookie(cookieValue, cookieSecret),
      catch: () => new Unauthenticated({}),
    });
    if (!did || !isDid(did)) {
      return yield* Effect.fail(new Unauthenticated({}));
    }

    return did;
  });
}

function restoreSession(did: Did, oauth: OAuthClient): Effect.Effect<OAuthSession, Unauthenticated> {
  return Effect.gen(function* () {
    const session = yield* Effect.tryPromise({
      try: () => oauth.restore(did),
      catch: () => new Unauthenticated({}),
    });
    if (!session) {
      return yield* Effect.fail(new Unauthenticated({}));
    }
    return session;
  });
}

// The fail-closed auth gate for every RPC call: the only thing in
// index.ts's Layer.mergeAll that supplies CurrentSession/AtprotoRepo.
export function makeSessionLayer(
  oauth: OAuthClient,
  cookieSecret: string,
): Layer.Layer<CurrentSession | AtprotoRepo, Unauthenticated, HttpServerRequest.HttpServerRequest> {
  return Layer.effectContext(
    Effect.gen(function* () {
      const request = yield* HttpServerRequest.HttpServerRequest;
      const did = yield* resolveDid(request.cookies[SESSION_COOKIE_NAME], cookieSecret);
      const session = yield* restoreSession(did, oauth);

      const repoContext = yield* Layer.build(AtprotoRepoLive(new Client({ handler: session })));
      return Context.add(repoContext, CurrentSession, { did });
    }),
  );
}
