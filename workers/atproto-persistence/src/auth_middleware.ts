import { Context, Effect, Layer } from "effect";
import { HttpServerRequest } from "effect/http";
import { isDid } from "@atcute/lexicons/syntax";
import { OAuthClient } from "@atcute/oauth-node-client";
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

// The fail-closed auth gate for every RPC call: the only thing in
// index.ts's Layer.mergeAll that supplies CurrentSession/AtprotoRepo.
export function makeSessionLayer(
  oauth: OAuthClient,
  cookieSecret: string,
): Layer.Layer<CurrentSession | AtprotoRepo, Unauthenticated, HttpServerRequest.HttpServerRequest> {
  return Layer.effectContext(
    Effect.gen(function* () {
      const fail = () => new Unauthenticated({});
      const request = yield* HttpServerRequest.HttpServerRequest;

      const cookieValue = request.cookies[SESSION_COOKIE_NAME];
      const did = cookieValue
        ? yield* Effect.tryPromise({
            try: () => verifyDidCookie(cookieValue, cookieSecret),
            catch: fail,
          })
        : null;
      if (!did || !isDid(did)) {
        return yield* Effect.fail(fail());
      }

      const session = yield* Effect.tryPromise({
        try: () => oauth.restore(did),
        catch: fail,
      });
      if (!session) {
        // Guards a misbehaving/future `restore` resolving falsy anyway.
        return yield* Effect.fail(fail());
      }

      const repoContext = yield* Layer.build(AtprotoRepoLive(new Client({ handler: session })));
      return Context.add(repoContext, CurrentSession, { did });
    }),
  );
}
