import "./patch_fetch";
import { Effect, Layer } from "effect";
import { HttpServerRequest, HttpServerResponse } from "effect/http";
import { RpcServer, RpcSerialization } from "effect/rpc";
import { isActorIdentifier, isDid } from "@atcute/lexicons/syntax";
import type { StoredState } from "@atcute/oauth-node-client";
import type { Env } from "./env";
import { makeKVStore } from "./kv_store";
import { buildOAuthClient } from "./oauth";
import { parseOrigin, popupResultResponse, resolveReturnToOrigin } from "./oauth_popup";
import { makeSessionLayer } from "./auth_middleware";
import { MapHandlersLive } from "./handlers";
import { handlePublicMap } from "./public_map";
import { MapRpcs } from "../../../shared/atproto_rpc";
import {
  readSessionCookie,
  sessionClearCookie,
  sessionSetCookie,
  signDidCookie,
  verifyDidCookie,
} from "./cookie";

// Behind the cloudflared tunnel used for local dev, the worker sees plain
// http://; forward the original scheme so the OAuth client_id is https.
function baseUrlFor(request: Request): string {
  const url = new URL(request.url);
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.slice(0, -1);
  return `${proto}://${url.host}`;
}

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin");
  if (!origin) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
  };
}

function withCors(request: Request, response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(corsHeaders(request))) {
    headers.set(name, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function handleClientMetadata(request: Request, env: Env): Promise<Response> {
  const oauth = buildOAuthClient(env, baseUrlFor(request));
  return Response.json(oauth.metadata);
}

async function handleLogin(request: Request, env: Env): Promise<Response> {
  const form = await request.formData();
  const handle = form.get("handle");
  if (typeof handle !== "string" || !isActorIdentifier(handle)) {
    return new Response("missing or invalid 'handle' field", { status: 400 });
  }

  // The popup reports its outcome back to this origin via postMessage.
  const origin = request.headers.get("origin");
  const frontendOrigin = origin ? parseOrigin(origin) : null;
  if (!frontendOrigin) {
    return new Response("missing or invalid 'Origin' header", { status: 400 });
  }

  try {
    const oauth = buildOAuthClient(env, baseUrlFor(request));
    const { url } = await oauth.authorize({
      target: { type: "account", identifier: handle },
      state: { returnTo: frontendOrigin },
    });
    return Response.redirect(url.toString(), 302);
  } catch {
    return new Response("could not start sign-in for that handle", { status: 502 });
  }
}

// Read before oauth.callback runs, which deletes the stored state immediately.
async function pendingReturnToOrigin(env: Env, stateId: string | null): Promise<string | null> {
  if (!stateId) {
    return null;
  }
  const states = makeKVStore<StoredState>(env.OAUTH_STATE_KV);
  try {
    const stored = await states.get(stateId);
    return stored ? resolveReturnToOrigin(stored.userState) : null;
  } catch {
    return null;
  }
}

async function handleCallback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const pendingOrigin = await pendingReturnToOrigin(env, url.searchParams.get("state"));

  try {
    const oauth = buildOAuthClient(env, baseUrlFor(request));
    const { session, state } = await oauth.callback(url.searchParams);
    const frontendOrigin = resolveReturnToOrigin(state) ?? pendingOrigin;
    if (!frontendOrigin) {
      return new Response("sign-in failed: missing return origin", { status: 400 });
    }

    const cookieValue = await signDidCookie(session.did, env.COOKIE_SECRET);
    return popupResultResponse({ type: "placemark-oauth-complete" }, frontendOrigin, {
      "Set-Cookie": sessionSetCookie(cookieValue),
    });
  } catch (e) {
    console.error(e);
    if (!pendingOrigin) {
      return new Response("sign-in failed", { status: 400 });
    }
    const message =
      url.searchParams.get("error") === "access_denied"
        ? "Sign-in was declined."
        : "Sign-in failed. Please try again.";
    return popupResultResponse({ type: "placemark-oauth-error", message }, pendingOrigin);
  }
}

// A plain route rather than an RPC method: logout needs to clear a
// Set-Cookie header, which the RPC response pipeline has no path for.
async function handleLogout(request: Request, env: Env): Promise<Response> {
  const cookieValue = readSessionCookie(request);
  const did = cookieValue ? await verifyDidCookie(cookieValue, env.COOKIE_SECRET) : null;

  if (did && isDid(did)) {
    const oauth = buildOAuthClient(env, baseUrlFor(request));
    try {
      await oauth.revoke(did);
    } catch (e) {
      // Still clear the cookie below even if revocation fails (e.g. the
      // stored session was already gone) -- the user should end up
      // signed out either way.
      console.error(e);
    }
  }

  return new Response(null, {
    status: 204,
    headers: { "Set-Cookie": sessionClearCookie() },
  });
}

async function handleRpc(request: Request, env: Env): Promise<Response> {
  const oauth = buildOAuthClient(env, baseUrlFor(request));

  // makeSessionLayer is the only supplier of CurrentSession/AtprotoRepo in
  // this graph, so it's the fail-closed auth gate for every RPC call.
  const program = Effect.gen(function* () {
    const httpEffect = yield* RpcServer.toHttpEffect(MapRpcs);
    return yield* httpEffect;
  }).pipe(
    Effect.scoped,
    Effect.provide(
      Layer.mergeAll(
        MapHandlersLive.pipe(Layer.provide(makeSessionLayer(oauth, env.COOKIE_SECRET))),
        RpcSerialization.layerJson,
      ),
    ),
    // Must come after Effect.provide above, so HttpServerRequest is ambient
    // in time for makeSessionLayer's own layer-build step.
    Effect.provideService(HttpServerRequest.HttpServerRequest, HttpServerRequest.fromWeb(request)),
    Effect.catchTag("Unauthenticated", () =>
      Effect.succeed(HttpServerResponse.jsonUnsafe({ error: "Unauthenticated" }, { status: 401 })),
    ),
  );

  const response = await Effect.runPromise(program);
  return withCors(request, HttpServerResponse.toWeb(response));
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    // effect/rpc's client POSTs to ".../rpc/" (trailing slash), not ".../rpc".
    const isRpcPath = url.pathname === "/rpc" || url.pathname === "/rpc/";

    if (request.method === "GET" && url.pathname === "/oauth/client-metadata.json") {
      return handleClientMetadata(request, env);
    }
    if (request.method === "POST" && url.pathname === "/oauth/login") {
      return handleLogin(request, env);
    }
    if (request.method === "GET" && url.pathname === "/oauth/callback") {
      return handleCallback(request, env);
    }
    if (request.method === "POST" && url.pathname === "/oauth/logout") {
      return withCors(request, await handleLogout(request, env));
    }
    if (request.method === "OPTIONS" && isRpcPath) {
      // Echo the requested headers rather than a fixed allow-list.
      const requestedHeaders = request.headers.get("access-control-request-headers");
      return new Response(null, {
        status: 204,
        headers: {
          ...corsHeaders(request),
          "Access-Control-Allow-Methods": "POST",
          "Access-Control-Allow-Headers": requestedHeaders ?? "content-type",
          "Access-Control-Max-Age": "86400",
        },
      });
    }
    if (request.method === "POST" && isRpcPath) {
      return handleRpc(request, env);
    }
    if (request.method === "GET" && url.pathname === "/public/map") {
      // No session required: share links are readable by anyone, like the
      // atproto records they point at. CORS so the app can fetch it.
      return withCors(request, await handlePublicMap(request));
    }

    return new Response("not found", { status: 404, headers: corsHeaders(request) });
  },
};
