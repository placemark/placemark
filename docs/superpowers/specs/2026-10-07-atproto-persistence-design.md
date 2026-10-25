# atproto (Bluesky) cloud persistence — design

Date: 2026-10-07

## 1. Overview & scope

A new, **optional** Cloudflare Worker (`workers/atproto-persistence`) lets a signed-in
Bluesky/atproto user save named maps to their own PDS repo, and list/open/delete them
later. It is explicit Save/Open snapshots layered on top of the existing
`MemPersistence` editor — not a live sync backend; every keystroke still goes through
the current in-browser moment log exactly as it does today.

Data ownership: maps live in the *user's* atproto repo (one record + one blob per map),
not in our database. The Worker is a thin backend-for-frontend: it holds the OAuth
session and makes atproto calls on the user's behalf. It stores no map data of its own.

The feature is fully absent unless configured: no provider URL set at build time means
no sign-in UI anywhere in the app, and the provider module isn't even imported. This is
implemented as a pluggable `CloudProvider` interface so atproto is one implementation
among potentially several in the future (the wishlist already mentions Dropbox and
GitHub connectors).

Libraries: no Effect-native atproto library exists (checked — only imperative options:
atcute, `@atproto/api`/`@atproto/lex`). Plan is to use **atcute** for the raw atproto
wire protocol (XRPC client, lexicons, OAuth primitives) and wrap it ourselves in
**Effect**: services via `Context.Tag`/`Layer`, tagged errors instead of throws,
`Effect.tryPromise` at the atcute boundary, `Schema` for validating records/responses,
and **Effect RPC** for the frontend↔Worker transport.

## 2. Architecture & components

```
Browser (Placemark SPA)
  │  cookie-based session, Effect RPC + a few plain redirect routes
  ▼
Worker: workers/atproto-persistence
  ├─ Durable Object "Session"    — one per logged-in session: DPoP keypair, access/
  │                                 refresh tokens, PDS service endpoint, DID. Keyed by
  │                                 a random session id in an HttpOnly/Secure/
  │                                 SameSite=Lax cookie.
  ├─ Durable Object "OAuthState" — short-lived, one per in-flight login: PKCE verifier,
  │                                 state, DPoP nonce, chosen PDS, handle. Deleted after
  │                                 the callback completes (or expires via alarm).
  └─ Effect services: AtprotoIdentity (handle→DID→PDS resolution), AtprotoOAuth (PAR,
     token exchange/refresh), AtprotoRepo (putRecord/getRecord/listRecords/
     uploadBlob) — all built on atcute.
  │
  ▼ (on behalf of the user, using their token)
User's PDS — stores the io.placemark.map record + the FlatGeobuf blob
```

No D1/KV/central database. The two Durable Object classes are the Worker's entire
state. `OAuthState` entries are cheap to expire (alarm-based cleanup); `Session`
entries live as long as the refresh token is valid (atproto confidential-client
sessions: up to 180 days).

## 3. Data model

Custom lexicon `io.placemark.map`, one record per saved map in the user's repo:

```json
{
  "$type": "io.placemark.map",
  "name": "My road trip",
  "createdAt": "2026-10-07T00:00:00.000Z",
  "updatedAt": "2026-10-07T00:00:00.000Z",
  "data": { "$type": "blob", "ref": {}, "mimeType": "application/flatgeobuf", "size": 12345 },
  "symbolization": {},
  "layer": {},
  "folders": [],
  "layerConfigs": []
}
```

`symbolization`, `layer`, `folders`, and `layerConfigs` are lexicon `unknown`-typed
fields, copied verbatim from the app's existing `ISymbolization` / basemap layer config
/ `IFolder[]` / `ILayerConfig[]` shapes (all already Zod-validated client-side). We
deliberately don't mirror those into a fully-specified lexicon schema — they already
evolve via Zod in this repo, and a second schema would just be something to keep in
sync. A Zod parse on read is enough. This can be tightened later if cross-app interop
on these records becomes a goal.

The blob is the FlatGeobuf encoding of all features. `IWrappedFeature` carries `id`,
`at`, `folderId`, and `ephemeral` alongside the geometry, none of which fits
FlatGeobuf's plain-GeoJSON model. The serializer folds them into reserved properties
(`__pm_id`, `__pm_at`, `__pm_folderId`, `__pm_ephemeral`) before encoding, and splits
them back out on decode. This builds directly on the existing `adjustForFgb` /
`FlatGeobuf` converter in `app/lib/convert/flatgeobuf.ts` rather than inventing a new
encoder.

Known constraint: PDS blob size limits vary by host (Bluesky's own PDS currently caps
around a few MB). Very large maps could exceed that — this should surface as a clear
error message in v1, not be solved with chunking.

## 4. Auth flow (atproto OAuth, confidential client)

1. User enters their handle (e.g. `tom.bsky.social`) in a "Sign in with Bluesky"
   dialog → this hits the plain `POST /oauth/login {handle}` route (not RPC).
2. Worker resolves handle → DID → PDS service endpoint (`AtprotoIdentity` service:
   HTTPS well-known first, DNS-over-HTTPS fallback via `fetch` — no `node:dns`, which
   doesn't exist in Workers).
3. Worker creates an `OAuthState` Durable Object: generates a PKCE verifier and a DPoP
   keypair (WebCrypto `crypto.subtle.generateKey`, ES256), performs a Pushed
   Authorization Request (PAR) against the PDS's authorization server, gets back a
   `request_uri`.
4. Worker 302s the browser to `<pds>/oauth/authorize?...request_uri=...`.
5. User approves on their PDS. PDS redirects to `GET /oauth/callback?code=...&state=...`
   (plain route, not RPC).
6. Worker loads the matching `OAuthState`, exchanges the code for tokens (confidential
   client: signs a `private_key_jwt` client assertion with the Worker's own fixed
   signing key, stored as a Worker secret), creates a `Session` Durable Object with the
   resulting access/refresh tokens + DPoP key, sets the session cookie, deletes the
   `OAuthState`, redirects back into the app.
7. Subsequent calls: Worker loads `Session` by cookie, attaches a DPoP proof + access
   token to atproto calls, and refreshes transparently on 401/expiry via the refresh
   token, using Effect retry / `Effect.catchTag` rather than ad hoc try/catch.

The Worker needs one fixed, durable ES256 keypair for client assertions, generated once
and stored as a secret — not per-session. `client-metadata.json` (served as a static
route) declares the client, redirect URI, and the public JWK for that key.

**Open risk, to resolve during implementation, not here:** whether to hand-roll this
with atcute's low-level pieces (`@atcute/client`, `@atcute/lexicons`, WebCrypto
directly) or lean on `@atcute/oauth-node-client` depends on whether that package's
internals (it's Node-targeted) actually run under `workerd`. Plan to **spike this
first**; the rest of this design doesn't depend on which one wins.

## 5. Worker API surface

```
Plain HTTP (redirect/static, not RPC):
  GET  /oauth/client-metadata.json
  POST /oauth/login        {handle}   → 302 to PDS
  GET  /oauth/callback                → 302 back into the app, sets session cookie

Effect RPC, single endpoint (e.g. POST /rpc), schema-defined methods:
  Me          -> {did, handle} | Unauthenticated
  Logout      -> void
  ListMaps    -> CloudMapSummary[]
  SaveMap     { name, doc } -> CloudMapSummary
  LoadMap     { rkey } -> CloudMapDocument | RecordNotFound
  UpdateMap   { rkey, name?, doc } -> CloudMapSummary
  DeleteMap   { rkey } -> void
```

An `RpcGroup` (current `@effect/rpc` API at implementation time) defines these methods
with `Schema` request/response/error types, in one module imported by both the Worker
and the frontend bundle, giving end-to-end type safety and letting tagged errors
(`RecordNotFound`, `BlobTooLarge`, etc.) cross the wire as themselves rather than being
flattened into HTTP status codes. The Worker serves it over Effect RPC's standard
Fetch-based HTTP transport — no Node-specific adapter needed, since it operates on
plain `Request`/`Response`, same as the rest of the Worker.

All routes — RPC and plain — run through one Effect program per request: a plain
Workers `fetch(request, env, ctx)` entrypoint builds a `Layer` (Session DO client,
AtprotoIdentity, AtprotoOAuth, AtprotoRepo, Config from `env`) and runs the matched
route's `Effect` with `Effect.runPromise`. No router framework needed at this size — a
small manual `URL.pathname` switch dispatches to either the RPC handler or one of the
three plain routes.

## 6. Frontend integration (optional, pluggable)

New interface, intentionally separate from `IPersistence` (this is snapshot save/open,
not live sync, so it doesn't need to implement `useTransact`/`useHistoryControl`/etc.):

```ts
interface CloudProvider {
  id: string; // "atproto"
  label: string; // "Bluesky"
  useAuthState(): { status: "signed-out" | "signed-in"; handle?: string };
  signIn(): void;
  signOut(): Promise<void>;
  listMaps(): Promise<CloudMapSummary[]>;
  saveMap(doc: CloudMapDocument, name: string): Promise<CloudMapSummary>;
  loadMap(id: string): Promise<CloudMapDocument>;
  deleteMap(id: string): Promise<void>;
}
```

The atproto implementation is a thin wrapper over a generated Effect `RpcClient`:
`signIn()` navigates to the plain `/oauth/login` route; `signOut()` and the map CRUD
methods call straight through the RPC client. Errors surface as the same tagged unions
defined server-side, so dialogs can `Effect.catchTag` on e.g. `RecordNotFound` directly.

`app/lib/cloud_providers/index.ts` exports `CLOUD_PROVIDERS: CloudProvider[]`,
populated only if a build-time env var (`VITE_ATPROTO_PERSISTENCE_URL`) is set —
unset means the array is empty and the provider module isn't imported, so it's
tree-shaken out of builds that don't configure it (e.g. self-hosted deployments that
want stock Placemark with no trace of this feature).

When non-empty, `CLOUD_PROVIDERS` adds a "Bluesky" entry to the menu bar's
cloud/file section: Sign in, Save, My Maps…, Sign out — following the existing
`app/components/dialogs/export.tsx` pattern for the "My Maps" list dialog.

This also sets up cleanly for the wishlist's Dropbox/GitHub connectors later — same
`CloudProvider` interface, different implementation, same registry.

## 7. Error handling

Tagged Effect errors (`Schema.TaggedError`) per failure mode: `Unauthenticated`,
`PdsUnreachable`, `BlobTooLarge`, `RecordNotFound`, `OAuthStateExpired`. For the plain
HTTP routes, one `Effect.catchTags` block at the boundary maps these to status codes +
redirects/JSON bodies. For RPC methods, the tagged errors are part of each method's
schema and cross the wire natively — no separate status-code mapping needed there.

## 8. Testing

Vitest for Effect services: pure, mockable `Layer`s for `AtprotoRepo`/`AtprotoOAuth`
(no real network), and for the FlatGeobuf fold/unfold round-trip (reuses the existing
`*.server.test.ts` convention already used for e.g. `vendor/arc.server.test.ts`). The
OAuth handshake itself is best covered by one real-PDS smoke test run manually against
a dev PDS, not CI.

## 9. Deployment

New workspace package `workers/atproto-persistence` (own `package.json`,
`wrangler.toml`, `tsconfig.json`), matching the shape of `workers/static` and
`workers/static-data`. Needs: a `compatibility_date` recent enough for stable Durable
Objects + WebCrypto (not the `2022-09-21` pin the older workers use), a custom
domain/route, and Worker secrets for the OAuth signing key and cookie-signing secret.
Domain/route naming (e.g. `atproto.placemark.io`) is a deploy-time decision for you to
confirm when wiring DNS, not an architectural one.

## 10. Open risks (to resolve in the implementation plan)

- `@atcute/oauth-node-client` Workers compatibility — spike early; fall back to
  hand-rolled WebCrypto OAuth (using `@atcute/client` + `@atcute/lexicons` directly) if
  it doesn't run under `workerd`.
- PDS blob size ceiling for very large maps — surface as a clear error, no chunking in
  v1.
- Handle→DID resolution without `node:dns` — HTTPS well-known + DoH-over-fetch.
- Exact current `@effect/rpc` API surface (it has moved around across Effect versions)
  — pin and verify against whatever `effect` version is adopted.
