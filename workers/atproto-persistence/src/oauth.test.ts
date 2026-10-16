import { expect, it } from "vitest";
import { generateClientAssertionKey } from "@atcute/oauth-crypto";
import { buildOAuthClient } from "./oauth";
import type { Env } from "./env";

function fakeEnv(signingKeyJson: string): Env {
  return {
    SESSION_KV: {} as KVNamespace,
    OAUTH_STATE_KV: {} as KVNamespace,
    OAUTH_SIGNING_KEY: signingKeyJson,
    COOKIE_SECRET: "test-secret",
  };
}

async function makeClient() {
  const jwk = await generateClientAssertionKey("test", "ES256");
  return buildOAuthClient(fakeEnv(JSON.stringify(jwk)), "https://atproto.placemark.io");
}

it("builds client metadata with the expected redirect URI and client id", async () => {
  const { metadata } = await makeClient();
  expect(metadata.client_id).toBe("https://atproto.placemark.io/oauth/client-metadata.json");
  expect(metadata.redirect_uris).toStrictEqual(["https://atproto.placemark.io/oauth/callback"]);
});

it("exposes a public JWKS containing no private key material", async () => {
  const { jwks } = await makeClient();
  expect(jwks?.keys.length).toBeGreaterThan(0);
  for (const key of jwks?.keys ?? []) {
    expect(key).not.toHaveProperty("d");
  }
});
