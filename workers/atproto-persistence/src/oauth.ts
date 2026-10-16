import {
  OAuthClient,
  scope,
  type ClientAssertionPrivateJwk,
  type OAuthClientStores,
} from "@atcute/oauth-node-client";
import type { Env } from "./env";
import { buildActorResolver } from "./identity";
import { makeKVStore } from "./kv_store";

// GC safety net matching the confidential-client refresh-token lifetime.
const SESSION_TTL_SECONDS = 180 * 24 * 60 * 60;
// Matches the lifetime of a Pushed Authorization Request.
const OAUTH_STATE_TTL_SECONDS = 10 * 60;

export function buildOAuthClient(env: Env, baseUrl: string): OAuthClient {
  const keyset: ClientAssertionPrivateJwk[] = [JSON.parse(env.OAUTH_SIGNING_KEY)];

  const stores: OAuthClientStores = {
    sessions: makeKVStore(env.SESSION_KV, { ttlSeconds: SESSION_TTL_SECONDS }),
    states: makeKVStore(env.OAUTH_STATE_KV, { ttlSeconds: OAUTH_STATE_TTL_SECONDS }),
  };

  const actorResolver = buildActorResolver();

  return new OAuthClient({
    metadata: {
      client_id: `${baseUrl}/oauth/client-metadata.json`,
      redirect_uris: [`${baseUrl}/oauth/callback`],
      scope: [
        scope.rpc({
          lxm: [
            "com.atproto.repo.putRecord",
            "com.atproto.repo.getRecord",
            "com.atproto.repo.listRecords",
            "com.atproto.repo.deleteRecord",
            "com.atproto.repo.uploadBlob",
          ],
          aud: "*",
        }),
        scope.repo({
          collection: ["io.placemark.map"],
          action: ["create", "update", "delete"],
        }),
        scope.blob({ accept: ["application/flatgeobuf"] }),
      ],
    },
    keyset,
    stores,
    actorResolver,
  });
}
