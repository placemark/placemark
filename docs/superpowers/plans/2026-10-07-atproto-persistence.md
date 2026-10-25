# atproto (Bluesky) Cloud Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a signed-in Bluesky/atproto user save named Placemark maps to their own PDS repo (FlatGeobuf blob + a small `io.placemark.map` record) and list/open/delete them later, as an optional plugin on top of the existing in-browser editor.

**Architecture:** A new standalone Cloudflare Worker (`workers/atproto-persistence`) is a thin BFF: it runs the atproto OAuth confidential-client handshake (via `@atcute/oauth-node-client`, verified pure-WebCrypto/fetch, no Node-only APIs), backs the library's session/state stores with two Durable Object classes, and exposes map CRUD over Effect RPC (`effect/rpc` + `effect/http`, Effect v4). The frontend gets a new `CloudProvider` plugin interface; the atproto implementation is a thin wrapper over a generated Effect RPC client. Nothing is wired into the default build unless `VITE_ATPROTO_PERSISTENCE_URL` is set.

**Tech Stack:** TypeScript, Effect v4 (`effect`, `effect/rpc`, `effect/http`), atcute (`@atcute/client`, `@atcute/lexicons`, `@atcute/atproto`, `@atcute/oauth-node-client`, `@atcute/oauth-crypto`, `@atcute/oauth-keyset`, `@atcute/oauth-types`, `@atcute/identity-resolver`), Cloudflare Workers + Durable Objects, Vitest, Formik/Radix (existing frontend dialog patterns).

## Global Constraints

- Never use `as` or `any` in TypeScript; prefer precise types (user's global TypeScript rule).
- Don't add compatibility shims, stub re-exports, or separate prop-type declarations; define component props inline (user's global conventions).
- `vitest`'s `toMatchObject` for partial-shape checks; `toStrictEqual`/`toEqual` when the exact value is the point of the assertion.
- Use `node:` protocol for any Node core import (should not be needed anywhere in this plan — flag immediately if a step seems to need one, since the worker must stay Workers-compatible).
- Pin the **exact same** `effect` version in the root `package.json` and in `workers/atproto-persistence/package.json` — the shared RPC schema module (`shared/atproto_rpc.ts`) gets bundled into both the frontend build and the Worker build separately, and a version mismatch risks two incompatible Effect runtimes.
- `effect/rpc` and `effect/http`'s server-side pieces are explicitly marked `@stability unstable` in Effect v4 — pin an exact version (no `^`/`~` range) for `effect` in both package.json files.
- This feature must be fully absent (no imports, no UI) unless `VITE_ATPROTO_PERSISTENCE_URL` is set at build time.
- Never commit/push/open PRs (user's global git rule) — stage changes and stop short of `git commit` at the end of each task's "Commit" step; tell the user instead.

---

## File Structure

```
shared/
  atproto_rpc.ts                 — RPC schema (MapRpcs) + tagged errors, imported by both sides

workers/atproto-persistence/
  package.json                   — standalone pnpm project, own lockfile (matches workers/static pattern)
  wrangler.toml
  tsconfig.json
  src/
    env.ts                       — Env bindings type
    cookie.ts                    — signed-DID cookie helpers
    cookie.test.ts
    durable-objects/
      store_logic.ts             — pure single-value KV logic (testable without workerd)
      store_logic.test.ts
      store_client.ts            — Store<K,V> adapter over a DurableObjectNamespace
      session_do.ts               — SessionDO class (thin wrapper over store_logic)
      oauth_state_do.ts           — OAuthStateDO class (thin wrapper + alarm-based expiry)
    oauth.ts                      — OAuthClient construction + AtprotoOAuth Effect service
    oauth.test.ts
    repo.ts                       — AtprotoRepo Effect service (putRecord/getRecord/listRecords/deleteRecord/uploadBlob)
    repo.test.ts
    auth_middleware.ts            — RpcMiddleware: reads signed cookie, loads SessionDO, provides `did`
    handlers.ts                   — MapRpcs.toLayer({...}) implementation
    handlers.test.ts
    index.ts                      — fetch entrypoint: plain routes + RPC adapter

app/lib/cloud_providers/
  types.ts                        — CloudProvider interface
  index.ts                        — CLOUD_PROVIDERS registry, gated by VITE_ATPROTO_PERSISTENCE_URL
  atproto/
    fgb_codec.ts                  — fold/unfold wrapped-feature metadata <-> FlatGeobuf bytes
    fgb_codec.server.test.ts
    client.ts                     — Effect RpcClient wrapper implementing CloudProvider
    load_into_editor.ts           — replaces dataAtom/layerConfigAtom/memoryMetaAtom/momentLogAtom wholesale

app/components/dialogs/
  cloud_sign_in.tsx               — "Sign in with Bluesky" dialog (handle input)
  cloud_maps.tsx                  — "My Maps" dialog (list/save/open/rename/delete)

Modified:
  app/lib/env_client.ts           — add ATPROTO_PERSISTENCE_URL
  state/dialog_state.ts           — add cloud_sign_in / cloud_maps dialog states
  app/components/dialogs.tsx      — wire new dialog cases
  app/components/menu_bar/menu_bar_dropdown.tsx — add Cloud submenu, gated on CLOUD_PROVIDERS.length
  vite.config.ts                  — add "shared" to localRoots alias
  package.json (root)             — add `effect` dependency
```

---

### Task 1: Scaffold the Worker package and verify it deploys

**Files:**
- Create: `workers/atproto-persistence/package.json`
- Create: `workers/atproto-persistence/wrangler.toml`
- Create: `workers/atproto-persistence/tsconfig.json`
- Create: `workers/atproto-persistence/src/index.ts`
- Create: `workers/atproto-persistence/src/durable-objects/session_do.ts`
- Create: `workers/atproto-persistence/src/durable-objects/oauth_state_do.ts`
- Create: `workers/atproto-persistence/src/env.ts`

**Interfaces:**
- Produces: `Env` type (`SESSION_DO: DurableObjectNamespace`, `OAUTH_STATE_DO: DurableObjectNamespace`, `OAUTH_SIGNING_KEY: string`, `COOKIE_SECRET: string`) — later tasks depend on this exact shape.
- Produces: `SessionDO`, `OAuthStateDO` classes exported from their files, bound in `wrangler.toml` under those exact binding names.

This task has no business logic yet — it exists purely to prove the deploy pipeline (Durable Object bindings, `wrangler dev`) works before building anything on top of it, per the design's flagged risk about Workers compatibility.

- [ ] **Step 1: Create the package**

```json
// workers/atproto-persistence/package.json
{
  "name": "atproto-persistence",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "test": "vitest run"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20250715.0",
    "typescript": "^5.8.3",
    "vitest": "^3.0.0",
    "wrangler": "4.24.3"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`** — copy `workers/static/tsconfig.json` verbatim (same compiler options: `target: es2021`, `types: ["@cloudflare/workers-types"]`, etc. — already correct for this use case).

- [ ] **Step 3: Create `wrangler.toml`**

```toml
name = "atproto-persistence"
main = "src/index.ts"
compatibility_date = "2026-09-01"
compatibility_flags = ["nodejs_compat"]

[[durable_objects.bindings]]
name = "SESSION_DO"
class_name = "SessionDO"

[[durable_objects.bindings]]
name = "OAUTH_STATE_DO"
class_name = "OAuthStateDO"

[[migrations]]
tag = "v1"
new_sqlite_classes = ["SessionDO", "OAuthStateDO"]
```

(`compatibility_date` must be recent enough for stable Durable Objects with SQLite storage backend and modern WebCrypto — `2026-09-01` satisfies that; confirm it's still ahead of `nodejs_compat`'s stabilization date when you actually run this, bump if `wrangler dev` warns.)

- [ ] **Step 4: Create `src/env.ts`**

```ts
export interface Env {
  SESSION_DO: DurableObjectNamespace;
  OAUTH_STATE_DO: DurableObjectNamespace;
  OAUTH_SIGNING_KEY: string;
  COOKIE_SECRET: string;
}
```

- [ ] **Step 5: Create stub Durable Object classes**

```ts
// workers/atproto-persistence/src/durable-objects/session_do.ts
import { DurableObject } from "cloudflare:workers";

export class SessionDO extends DurableObject {
  fetch(_request: Request): Response {
    return new Response("stub", { status: 501 });
  }
}
```

```ts
// workers/atproto-persistence/src/durable-objects/oauth_state_do.ts
import { DurableObject } from "cloudflare:workers";

export class OAuthStateDO extends DurableObject {
  fetch(_request: Request): Response {
    return new Response("stub", { status: 501 });
  }
}
```

- [ ] **Step 6: Create `src/index.ts`**

```ts
import type { Env } from "./env";
import { OAuthStateDO } from "./durable-objects/oauth_state_do";
import { SessionDO } from "./durable-objects/session_do";

export { OAuthStateDO, SessionDO };

export default {
  async fetch(_request: Request, _env: Env): Promise<Response> {
    return new Response("ok");
  },
};
```

- [ ] **Step 7: Install and smoke-test**

Run: `cd workers/atproto-persistence && pnpm install`
Expected: lockfile created, no errors.

Run: `pnpm run dev` (in one terminal), then in another: `curl http://localhost:8787/`
Expected: response body `ok`.

Stop the dev server. This confirms Durable Object bindings + `nodejs_compat` + the basic fetch handler all work together before any real logic is added.

- [ ] **Step 8: Commit**

Stage `workers/atproto-persistence/` and stop — tell the user these files are ready to commit (per the no-commit global rule), don't run `git commit` yourself.

---

### Task 2: Shared RPC schema and tagged errors

**Files:**
- Create: `shared/atproto_rpc.ts`
- Create: `shared/atproto_rpc.server.test.ts`
- Modify: `vite.config.ts:6` (add `"shared"` to `localRoots`)
- Modify: `package.json` (root) — add `"effect"` dependency

**Interfaces:**
- Produces: `Unauthenticated`, `RecordNotFound`, `BlobTooLarge` (tagged error classes), `CloudMapSummary`, `CloudMapDocument` (Schema classes), `MapRpcs` (RpcGroup) — every later task (worker handlers, frontend client) imports from this exact module via the `shared/atproto_rpc` alias.

`CloudMapDocument.dataBase64` carries the FlatGeobuf-encoded features as a base64 string (chosen over a Schema binary-transform combinator specifically to avoid depending on an unverified Effect Schema API — plain string + explicit encode/decode at the boundary is simple and certain to work). `symbolization`/`layer`/`folders`/`layerConfigs` are `Schema.Unknown` — they mirror this app's existing Zod-validated shapes (`ISymbolization`, basemap layer config, `IFolder[]`, `ILayerConfig[]`) and are passed through opaque rather than re-specified in a second schema language.

- [ ] **Step 1: Add the dependency and alias**

Run: `pnpm add effect@4.0.1` (from repo root — pin exact version per the Global Constraints section).

```ts
// vite.config.ts — change this line:
const localRoots = ["app", "types", "state", "integrations", "test", "vendor", "styles"];
// to:
const localRoots = ["app", "types", "state", "integrations", "test", "vendor", "styles", "shared"];
```

- [ ] **Step 2: Write the failing test**

```ts
// shared/atproto_rpc.server.test.ts
import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { CloudMapDocument, CloudMapSummary, MapRpcs, RecordNotFound, Unauthenticated } from "./atproto_rpc";

describe("atproto_rpc schema", () => {
  it("round-trips a CloudMapDocument", () => {
    const input = {
      dataBase64: "AAAA",
      symbolization: { type: "none" },
      layer: null,
      folders: [],
      layerConfigs: [],
    };
    const decoded = Schema.decodeUnknownSync(CloudMapDocument)(input);
    expect(decoded).toMatchObject(input);
  });

  it("round-trips a CloudMapSummary", () => {
    const input = { rkey: "3abc123", name: "My map", updatedAt: "2026-10-07T00:00:00.000Z" };
    const decoded = Schema.decodeUnknownSync(CloudMapSummary)(input);
    expect(decoded).toStrictEqual(input);
  });

  it("tags Unauthenticated and RecordNotFound errors correctly", () => {
    const unauth = new Unauthenticated({});
    const notFound = new RecordNotFound({ rkey: "3abc123" });
    expect(unauth._tag).toBe("Unauthenticated");
    expect(notFound._tag).toBe("RecordNotFound");
    expect(notFound.rkey).toBe("3abc123");
  });

  it("exposes all seven RPC methods on MapRpcs", () => {
    const names = Array.from(MapRpcs.requests.keys());
    expect(names).toStrictEqual([
      "Me",
      "Logout",
      "ListMaps",
      "SaveMap",
      "LoadMap",
      "UpdateMap",
      "DeleteMap",
    ]);
  });
});
```

- [ ] **Step 2b: Run it to confirm it fails**

Run: `pnpm vitest run shared/atproto_rpc.server.test.ts`
Expected: FAIL — `shared/atproto_rpc.ts` doesn't exist yet.

(If `MapRpcs.requests` turns out not to be the real property name for listing a group's methods once `effect/rpc` is installed, inspect `node_modules/effect/dist/dts/rpc/RpcGroup.d.ts` and adjust that one assertion — the rest of the test is independent of it.)

- [ ] **Step 3: Write the implementation**

```ts
// shared/atproto_rpc.ts
import { Schema } from "effect";
import { Rpc, RpcGroup } from "effect/rpc";

export class Unauthenticated extends Schema.TaggedError<Unauthenticated>()(
  "Unauthenticated",
  {},
) {}

export class RecordNotFound extends Schema.TaggedError<RecordNotFound>()(
  "RecordNotFound",
  { rkey: Schema.String },
) {}

export class BlobTooLarge extends Schema.TaggedError<BlobTooLarge>()(
  "BlobTooLarge",
  { maxBytes: Schema.Number, actualBytes: Schema.Number },
) {}

export class CloudMapSummary extends Schema.Class<CloudMapSummary>(
  "CloudMapSummary",
)({
  rkey: Schema.String,
  name: Schema.String,
  updatedAt: Schema.String,
}) {}

export class CloudMapDocument extends Schema.Class<CloudMapDocument>(
  "CloudMapDocument",
)({
  dataBase64: Schema.String,
  symbolization: Schema.Unknown,
  layer: Schema.Unknown,
  folders: Schema.Unknown,
  layerConfigs: Schema.Unknown,
}) {}

const NotFoundOrAuth = Schema.Union(Unauthenticated, RecordNotFound);

export class MapRpcs extends RpcGroup.make(
  Rpc.make("Me", {
    success: Schema.Struct({ did: Schema.String, handle: Schema.String }),
    error: Unauthenticated,
  }),
  Rpc.make("Logout", {}),
  Rpc.make("ListMaps", {
    success: Schema.Array(CloudMapSummary),
    error: Unauthenticated,
  }),
  Rpc.make("SaveMap", {
    payload: { name: Schema.String, doc: CloudMapDocument },
    success: CloudMapSummary,
    error: Unauthenticated,
  }),
  Rpc.make("LoadMap", {
    payload: { rkey: Schema.String },
    success: CloudMapDocument,
    error: NotFoundOrAuth,
  }),
  Rpc.make("UpdateMap", {
    payload: {
      rkey: Schema.String,
      name: Schema.optional(Schema.String),
      doc: CloudMapDocument,
    },
    success: CloudMapSummary,
    error: NotFoundOrAuth,
  }),
  Rpc.make("DeleteMap", {
    payload: { rkey: Schema.String },
    error: NotFoundOrAuth,
  }),
) {}
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `pnpm vitest run shared/atproto_rpc.server.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

Stage `shared/atproto_rpc.ts`, `shared/atproto_rpc.server.test.ts`, `vite.config.ts`, `package.json`, `pnpm-lock.yaml` and stop short of committing.

---

### Task 3: FlatGeobuf fold/unfold codec

**Files:**
- Create: `app/lib/cloud_providers/atproto/fgb_codec.ts`
- Create: `app/lib/cloud_providers/atproto/fgb_codec.server.test.ts`

**Interfaces:**
- Consumes: `IWrappedFeature`, `FeatureCollection` from `types`; `adjustForFgb` from `app/lib/convert/flatgeobuf`.
- Produces: `encodeFeaturesToFlatGeobuf(features: IWrappedFeature[]): Promise<Uint8Array>`, `decodeFlatGeobufToFeatures(bytes: Uint8Array): Promise<IWrappedFeature[]>` — the frontend `CloudProvider` implementation (Task 9) calls these directly; the Worker never sees Placemark's feature types, only opaque bytes.

Ephemeral features (`ephemeral: true`, meaning an in-progress, not-yet-committed draw) are deliberately excluded from encoding — they shouldn't be persisted as permanent saved data.

- [ ] **Step 1: Write the failing test**

```ts
// app/lib/cloud_providers/atproto/fgb_codec.server.test.ts
import { describe, expect, it } from "vitest";
import type { IWrappedFeature } from "types";
import { decodeFlatGeobufToFeatures, encodeFeaturesToFlatGeobuf } from "./fgb_codec";

describe("fgb_codec", () => {
  it("round-trips wrapped features through FlatGeobuf", async () => {
    const features: IWrappedFeature[] = [
      {
        id: "f1",
        at: "a0",
        folderId: null,
        feature: {
          type: "Feature",
          geometry: { type: "Point", coordinates: [10, 20] },
          properties: { name: "Cafe" },
        },
      },
      {
        id: "f2",
        at: "a1",
        folderId: "folder-1",
        feature: {
          type: "Feature",
          geometry: { type: "Point", coordinates: [30, 40] },
          properties: null,
        },
      },
    ];

    const bytes = await encodeFeaturesToFlatGeobuf(features);
    const decoded = await decodeFlatGeobufToFeatures(bytes);

    expect(decoded).toHaveLength(2);
    expect(decoded.find((f) => f.id === "f1")).toMatchObject({
      id: "f1",
      at: "a0",
      folderId: null,
      feature: {
        geometry: { type: "Point", coordinates: [10, 20] },
        properties: { name: "Cafe" },
      },
    });
    expect(decoded.find((f) => f.id === "f2")).toMatchObject({
      id: "f2",
      at: "a1",
      folderId: "folder-1",
    });
  });

  it("drops ephemeral features when encoding", async () => {
    const features: IWrappedFeature[] = [
      {
        id: "f1",
        at: "a0",
        folderId: null,
        ephemeral: true,
        feature: {
          type: "Feature",
          geometry: { type: "Point", coordinates: [0, 0] },
          properties: null,
        },
      },
    ];

    const bytes = await encodeFeaturesToFlatGeobuf(features);
    const decoded = await decodeFlatGeobufToFeatures(bytes);
    expect(decoded).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm vitest run app/lib/cloud_providers/atproto/fgb_codec.server.test.ts`
Expected: FAIL — module doesn't exist yet.

- [ ] **Step 3: Write the implementation**

```ts
// app/lib/cloud_providers/atproto/fgb_codec.ts
import { adjustForFgb } from "app/lib/convert/flatgeobuf";
import type { Feature, FeatureCollection, IWrappedFeature } from "types";

const ID_KEY = "__pm_id";
const AT_KEY = "__pm_at";
const FOLDER_ID_KEY = "__pm_folderId";

export async function encodeFeaturesToFlatGeobuf(
  features: IWrappedFeature[],
): Promise<Uint8Array> {
  const flatgeobuf = await import("flatgeobuf/lib/mjs/geojson");

  const persistable = features.filter((wrapped) => !wrapped.ephemeral);

  const collection: FeatureCollection = {
    type: "FeatureCollection",
    features: persistable.map((wrapped): Feature => ({
      ...wrapped.feature,
      properties: {
        ...(wrapped.feature.properties ?? {}),
        [ID_KEY]: wrapped.id,
        [AT_KEY]: wrapped.at,
        [FOLDER_ID_KEY]: wrapped.folderId,
      },
    })),
  };

  const adjusted = adjustForFgb(collection);
  return flatgeobuf.serialize(adjusted) as Uint8Array;
}

export async function decodeFlatGeobufToFeatures(
  bytes: Uint8Array,
): Promise<IWrappedFeature[]> {
  const flatgeobuf = await import("flatgeobuf/lib/mjs/geojson");

  const wrapped: IWrappedFeature[] = [];
  const iterator = flatgeobuf.deserialize(bytes);
  for await (const feature of iterator) {
    const properties = { ...(feature.properties ?? {}) };
    const id = properties[ID_KEY] as string;
    const at = properties[AT_KEY] as string;
    const folderId = properties[FOLDER_ID_KEY] as string | null;
    delete properties[ID_KEY];
    delete properties[AT_KEY];
    delete properties[FOLDER_ID_KEY];

    wrapped.push({
      id,
      at,
      folderId,
      feature: {
        ...feature,
        properties: Object.keys(properties).length ? properties : null,
      },
    });
  }
  return wrapped;
}
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `pnpm vitest run app/lib/cloud_providers/atproto/fgb_codec.server.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

Stage the two new files and stop short of committing.

---

### Task 4: Durable Object store logic (pure) + thin DO wrappers

**Files:**
- Create: `workers/atproto-persistence/src/durable-objects/store_logic.ts`
- Create: `workers/atproto-persistence/src/durable-objects/store_logic.test.ts`
- Create: `workers/atproto-persistence/src/durable-objects/store_client.ts`
- Modify: `workers/atproto-persistence/src/durable-objects/session_do.ts` (replace stub body)
- Modify: `workers/atproto-persistence/src/durable-objects/oauth_state_do.ts` (replace stub body, add alarm-based expiry)

**Interfaces:**
- Consumes: nothing from earlier tasks except `Env` from Task 1.
- Produces: `handleStoreRequest(storage, request): Promise<Response>`, a `Store<K, V>`-shaped object from `makeDurableObjectStore<V>(namespace, { ttlMs? })` (`get`, `set`, `delete`, `clear`) — Task 6 (OAuth client construction) depends on this exact function signature and the `Store` shape (`get(key, options?)`, `set(key, value)`, `delete(key)`, `clear()`), which matches `@atcute/oauth-node-client`'s expected `Store<K, V>` interface structurally (not imported — redefined locally since it's a simple 4-method shape, see Task 6 for why).

- [ ] **Step 1: Write the failing test for the pure logic**

```ts
// workers/atproto-persistence/src/durable-objects/store_logic.test.ts
import { describe, expect, it } from "vitest";
import { handleStoreRequest, type DOStorageLike } from "./store_logic";

function fakeStorage(): DOStorageLike {
  const data = new Map<string, unknown>();
  return {
    async get(key) {
      return data.get(key);
    },
    async put(key, value) {
      data.set(key, value);
    },
    async delete(key) {
      return data.delete(key);
    },
  };
}

describe("handleStoreRequest", () => {
  it("returns null for a get on an empty store", async () => {
    const storage = fakeStorage();
    const response = await handleStoreRequest(storage, new Request("http://do/?op=get"));
    expect(await response.json()).toStrictEqual({ value: null });
  });

  it("sets then gets a value", async () => {
    const storage = fakeStorage();
    await handleStoreRequest(
      storage,
      new Request("http://do/?op=set", {
        method: "POST",
        body: JSON.stringify({ value: { hello: "world" } }),
      }),
    );
    const response = await handleStoreRequest(storage, new Request("http://do/?op=get"));
    expect(await response.json()).toStrictEqual({ value: { hello: "world" } });
  });

  it("deletes a value", async () => {
    const storage = fakeStorage();
    await handleStoreRequest(
      storage,
      new Request("http://do/?op=set", { method: "POST", body: JSON.stringify({ value: 1 }) }),
    );
    await handleStoreRequest(storage, new Request("http://do/?op=delete", { method: "POST" }));
    const response = await handleStoreRequest(storage, new Request("http://do/?op=get"));
    expect(await response.json()).toStrictEqual({ value: null });
  });

  it("rejects an unknown op", async () => {
    const storage = fakeStorage();
    const response = await handleStoreRequest(storage, new Request("http://do/?op=bogus"));
    expect(response.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `cd workers/atproto-persistence && pnpm vitest run src/durable-objects/store_logic.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement the pure logic**

```ts
// workers/atproto-persistence/src/durable-objects/store_logic.ts
export interface DOStorageLike {
  get(key: string): Promise<unknown>;
  put(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<boolean>;
}

const VALUE_KEY = "value";

export async function handleStoreRequest(
  storage: DOStorageLike,
  request: Request,
): Promise<Response> {
  const url = new URL(request.url);
  const op = url.searchParams.get("op");

  switch (op) {
    case "get": {
      const value = await storage.get(VALUE_KEY);
      return Response.json({ value: value ?? null });
    }
    case "set": {
      const body = (await request.json()) as { value: unknown };
      await storage.put(VALUE_KEY, body.value);
      return new Response(null, { status: 204 });
    }
    case "delete": {
      await storage.delete(VALUE_KEY);
      return new Response(null, { status: 204 });
    }
    default:
      return new Response("unknown op", { status: 400 });
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `cd workers/atproto-persistence && pnpm vitest run src/durable-objects/store_logic.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Wire the thin DO wrappers**

```ts
// workers/atproto-persistence/src/durable-objects/session_do.ts
import { DurableObject } from "cloudflare:workers";
import { handleStoreRequest } from "./store_logic";

export class SessionDO extends DurableObject {
  fetch(request: Request): Promise<Response> {
    return handleStoreRequest(this.ctx.storage, request);
  }
}
```

```ts
// workers/atproto-persistence/src/durable-objects/oauth_state_do.ts
import { DurableObject } from "cloudflare:workers";
import { handleStoreRequest } from "./store_logic";

const STATE_TTL_MS = 10 * 60 * 1000;

export class OAuthStateDO extends DurableObject {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.searchParams.get("op") === "set") {
      await this.ctx.storage.setAlarm(Date.now() + STATE_TTL_MS);
    }
    return handleStoreRequest(this.ctx.storage, request);
  }

  async alarm(): Promise<void> {
    await this.ctx.storage.delete("value");
  }
}
```

- [ ] **Step 6: Write the Store<K,V> adapter**

```ts
// workers/atproto-persistence/src/durable-objects/store_client.ts
export interface Store<K, V> {
  get(key: K, options?: { signal?: AbortSignal }): Promise<V | undefined>;
  set(key: K, value: V): Promise<void>;
  delete(key: K): Promise<void>;
  clear(): Promise<void>;
}

export function makeDurableObjectStore<V>(
  namespace: DurableObjectNamespace,
): Store<string, V> {
  function stub(key: string) {
    return namespace.get(namespace.idFromName(key));
  }

  return {
    async get(key) {
      const response = await stub(key).fetch("http://do/?op=get");
      const body = (await response.json()) as { value: V | null };
      return body.value ?? undefined;
    },
    async set(key, value) {
      await stub(key).fetch("http://do/?op=set", {
        method: "POST",
        body: JSON.stringify({ value }),
      });
    },
    async delete(key) {
      await stub(key).fetch("http://do/?op=delete", { method: "POST" });
    },
    async clear() {
      // Each shard (one Durable Object instance per key, via idFromName)
      // only ever holds one entry for its own key — there's no single
      // shard that could enumerate the whole keyspace. oauth-node-client
      // doesn't call clear() during the login/session flows this project
      // uses, so this is intentionally a no-op rather than an approximation
      // of something that isn't reachable from a sharded store.
    },
  };
}
```

- [ ] **Step 7: Smoke-test via wrangler dev**

Run: `pnpm run dev` (in `workers/atproto-persistence`), confirm it still starts without errors (the DO classes now have real bodies instead of 501 stubs).

- [ ] **Step 8: Commit**

Stage the durable-objects files and stop short of committing.

---

### Task 5: Signed-DID cookie

**Files:**
- Create: `workers/atproto-persistence/src/cookie.ts`
- Create: `workers/atproto-persistence/src/cookie.test.ts`

**Interfaces:**
- Produces: `signDidCookie(did: string, secret: string): Promise<string>`, `verifyDidCookie(cookieValue: string, secret: string): Promise<string | null>` — Task 7 (auth middleware) depends on these exact signatures.

The cookie value is `${did}.${base64url(HMAC-SHA256(secret, did))}` — carrying the DID directly (not a secret), signed so it can't be forged, and used to pick which `SessionDO` shard (`idFromName(did)`) to query. This replaces the earlier "random session id" idea from the design doc with something that maps 1:1 onto atcute's own `Store<Did, StoredSession>` interface — no extra indirection needed.

- [ ] **Step 1: Write the failing test**

```ts
// workers/atproto-persistence/src/cookie.test.ts
import { describe, expect, it } from "vitest";
import { signDidCookie, verifyDidCookie } from "./cookie";

describe("signed DID cookie", () => {
  const secret = "test-secret";

  it("round-trips a valid cookie", async () => {
    const cookie = await signDidCookie("did:plc:abc123", secret);
    const did = await verifyDidCookie(cookie, secret);
    expect(did).toBe("did:plc:abc123");
  });

  it("rejects a tampered DID", async () => {
    const cookie = await signDidCookie("did:plc:abc123", secret);
    const [, signature] = cookie.split(".");
    const tampered = `did:plc:evil.${signature}`;
    expect(await verifyDidCookie(tampered, secret)).toBeNull();
  });

  it("rejects a tampered signature", async () => {
    const cookie = await signDidCookie("did:plc:abc123", secret);
    const tampered = `${cookie}x`;
    expect(await verifyDidCookie(tampered, secret)).toBeNull();
  });

  it("rejects a cookie signed with a different secret", async () => {
    const cookie = await signDidCookie("did:plc:abc123", secret);
    expect(await verifyDidCookie(cookie, "other-secret")).toBeNull();
  });

  it("rejects a malformed cookie", async () => {
    expect(await verifyDidCookie("not-a-valid-cookie", secret)).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `cd workers/atproto-persistence && pnpm vitest run src/cookie.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement**

```ts
// workers/atproto-persistence/src/cookie.ts
const encoder = new TextEncoder();

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function toBase64Url(bytes: ArrayBuffer): string {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const paddingLength = (4 - (padded.length % 4)) % 4;
  const binary = atob(padded + "=".repeat(paddingLength));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export async function signDidCookie(did: string, secret: string): Promise<string> {
  const key = await hmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(did));
  return `${did}.${toBase64Url(signature)}`;
}

export async function verifyDidCookie(
  cookieValue: string,
  secret: string,
): Promise<string | null> {
  const separatorIndex = cookieValue.lastIndexOf(".");
  if (separatorIndex === -1) {
    return null;
  }
  const did = cookieValue.slice(0, separatorIndex);
  const signature = cookieValue.slice(separatorIndex + 1);

  let signatureBytes: Uint8Array;
  try {
    signatureBytes = fromBase64Url(signature);
  } catch {
    return null;
  }

  const key = await hmacKey(secret);
  const valid = await crypto.subtle.verify("HMAC", key, signatureBytes, encoder.encode(did));
  return valid ? did : null;
}
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `cd workers/atproto-persistence && pnpm vitest run src/cookie.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

Stage the two cookie files and stop short of committing.

---

### Task 6: OAuth client construction (AtprotoOAuth)

**Files:**
- Create: `workers/atproto-persistence/src/oauth.ts`
- Create: `workers/atproto-persistence/src/oauth.test.ts`
- Modify: `workers/atproto-persistence/package.json` (add atcute dependencies)

**Interfaces:**
- Consumes: `makeDurableObjectStore` from Task 4; `Env` from Task 1.
- Produces: `buildOAuthClient(env: Env, baseUrl: string): OAuthClient` — Task 8 (RPC handlers) and Task 10 (worker entrypoint) depend on this function and on the `OAuthClient` instance's `authorize`, `callback`, `restore`, `revoke` methods, `metadata`, and `jwks` properties (all from `@atcute/oauth-node-client`, used exactly per its own API — not wrapped further here, since the library's own types are already precise).

**Operational step (not code):** generate the confidential-client signing key once, before this task's tests matter in practice (the tests below don't need network, but a real deploy does):

```ts
// run once, e.g. via `node --experimental-strip-types` or a scratch script — NOT part of the Worker's runtime code
import { generateClientAssertionKey } from "@atcute/oauth-crypto";
const jwk = await generateClientAssertionKey("main", "ES256");
console.log(JSON.stringify(jwk));
```

Store the printed JSON as the `OAUTH_SIGNING_KEY` Worker secret: `wrangler secret put OAUTH_SIGNING_KEY` (paste the JSON when prompted). Also set `COOKIE_SECRET` to any long random string the same way.

- [ ] **Step 1: Add dependencies**

Run (inside `workers/atproto-persistence`):
```
pnpm add @atcute/client @atcute/lexicons @atcute/atproto @atcute/oauth-node-client @atcute/oauth-crypto @atcute/oauth-keyset @atcute/oauth-types @atcute/identity-resolver nanoid valibot effect@4.0.1
```

- [ ] **Step 2: Write the failing test**

This test only checks the parts that don't need network: that `buildOAuthClient` constructs without throwing, and that the exposed `client-metadata.json`/`jwks.json` shapes contain the fields the design's auth flow depends on.

```ts
// workers/atproto-persistence/src/oauth.test.ts
import { describe, expect, it } from "vitest";
import { generateClientAssertionKey } from "@atcute/oauth-crypto";
import { buildOAuthClient } from "./oauth";
import type { Env } from "./env";

function fakeEnv(signingKeyJson: string): Env {
  return {
    SESSION_DO: {} as DurableObjectNamespace,
    OAUTH_STATE_DO: {} as DurableObjectNamespace,
    OAUTH_SIGNING_KEY: signingKeyJson,
    COOKIE_SECRET: "test-secret",
  };
}

describe("buildOAuthClient", () => {
  it("builds client metadata with the expected redirect URI and client id", async () => {
    const jwk = await generateClientAssertionKey("test", "ES256");
    const client = buildOAuthClient(fakeEnv(JSON.stringify(jwk)), "https://atproto.placemark.io");

    expect(client.metadata.client_id).toBe(
      "https://atproto.placemark.io/oauth/client-metadata.json",
    );
    expect(client.metadata.redirect_uris).toStrictEqual([
      "https://atproto.placemark.io/oauth/callback",
    ]);
  });

  it("exposes a public JWKS containing no private key material", async () => {
    const jwk = await generateClientAssertionKey("test", "ES256");
    const client = buildOAuthClient(fakeEnv(JSON.stringify(jwk)), "https://atproto.placemark.io");

    expect(client.jwks?.keys.length).toBeGreaterThan(0);
    for (const key of client.jwks?.keys ?? []) {
      expect(key).not.toHaveProperty("d");
    }
  });
});
```

- [ ] **Step 3: Run it to confirm it fails**

Run: `cd workers/atproto-persistence && pnpm vitest run src/oauth.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 4: Implement**

```ts
// workers/atproto-persistence/src/oauth.ts
import {
  OAuthClient,
  scope,
  type ClientAssertionPrivateJwk,
  type OAuthClientStores,
} from "@atcute/oauth-node-client";
import {
  CompositeDidDocumentResolver,
  CompositeHandleResolver,
  DohJsonHandleResolver,
  LocalActorResolver,
  PlcDidDocumentResolver,
  WebDidDocumentResolver,
  WellKnownHandleResolver,
} from "@atcute/identity-resolver";
import type { Did } from "@atcute/lexicons";
import type { Env } from "./env";
import { makeDurableObjectStore } from "./durable-objects/store_client";

export function buildOAuthClient(env: Env, baseUrl: string): OAuthClient {
  const keyset: ClientAssertionPrivateJwk[] = [JSON.parse(env.OAUTH_SIGNING_KEY)];

  const stores: OAuthClientStores = {
    sessions: makeDurableObjectStore(env.SESSION_DO),
    states: makeDurableObjectStore(env.OAUTH_STATE_DO),
  };

  const actorResolver = new LocalActorResolver({
    handleResolver: new CompositeHandleResolver({
      methods: {
        dns: new DohJsonHandleResolver({ dohUrl: "https://mozilla.cloudflare-dns.com/dns-query" }),
        http: new WellKnownHandleResolver(),
      },
    }),
    didDocumentResolver: new CompositeDidDocumentResolver({
      methods: {
        plc: new PlcDidDocumentResolver(),
        web: new WebDidDocumentResolver(),
      },
    }),
  });

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
        scope.blob({ accept: ["application/flatgeobuf"] }),
      ],
    },
    keyset,
    stores,
    actorResolver,
  });
}

export type { Did };
```

(`Did` is re-exported here purely so Task 7/8 can import it from one place rather than reaching into `@atcute/lexicons` directly — drop this re-export if later tasks end up importing it from `@atcute/lexicons` themselves instead; don't carry an unused re-export.)

- [ ] **Step 5: Run tests to confirm they pass**

Run: `cd workers/atproto-persistence && pnpm vitest run src/oauth.test.ts`
Expected: PASS (2 tests).

If `OAuthClient`'s actual exported shape differs from this (e.g. `metadata`/`jwks` are methods rather than properties, or `ClientAssertionPrivateJwk`/`OAuthClientStores` aren't both exported from the package root) — check `node_modules/@atcute/oauth-node-client/dist/index.d.ts` directly and adjust the implementation and test together; the research behind this task was based on source inspection, not the published `.d.ts`, so treat this as the first point to re-verify against the installed package.

- [ ] **Step 6: Commit**

Stage `oauth.ts`, `oauth.test.ts`, `package.json`, `pnpm-lock.yaml` and stop short of committing.

---

### Task 7: Auth middleware

**Files:**
- Create: `workers/atproto-persistence/src/auth_middleware.ts`

**Interfaces:**
- Consumes: `verifyDidCookie` (Task 5), `buildOAuthClient`'s `.restore(did)` (Task 6), `Unauthenticated` (Task 2, from `shared/atproto_rpc`).
- Produces: `AuthMiddleware` (an `RpcMiddleware` service) providing a `CurrentSession` context tag (`{ did: string }`) to every handler in `MapRpcs` — Task 8's handlers consume `CurrentSession` via `yield*`.

This is the one piece the research flagged as needing a final check against installed types rather than a secondhand snippet (the exact call for providing a server-side middleware implementation). Do that check as the first step, not after writing speculative code.

- [ ] **Step 1: Confirm the construction API against installed types**

Run: `cd workers/atproto-persistence && pnpm add effect@4.0.1` (if not already present from Task 2's root install — this package has its own standalone `node_modules`, so it needs its own copy too, pinned to the same exact version per the Global Constraints section).

Open `node_modules/effect/dist/dts/rpc/RpcMiddleware.d.ts` and confirm: (a) the exact factory call for defining a middleware service (research found `RpcMiddleware.Service<Self>()(id, { error, requiredForClient })`), and (b) how a server-side implementation is attached — likely a `Layer.succeed`/`.toLayer()`/`.of()` call inherited from `Context.Service`'s construction helpers. Adjust Step 3 below to match whatever's actually there before writing it for real.

- [ ] **Step 2: Define the context this middleware provides**

```ts
// workers/atproto-persistence/src/auth_middleware.ts
import { Context, Effect, Layer } from "effect";
import { RpcMiddleware } from "effect/rpc";
import type { OAuthClient } from "@atcute/oauth-node-client";
import { Unauthenticated } from "shared/atproto_rpc";
import { verifyDidCookie } from "./cookie";

export interface CurrentSessionShape {
  did: string;
}

export class CurrentSession extends Context.Tag("CurrentSession")<
  CurrentSession,
  CurrentSessionShape
>() {}
```

- [ ] **Step 3: Define and implement the middleware**

(Write this against whatever Step 1 confirmed — the shape below is the best-evidenced guess from the research and should need only small adjustments, not a rewrite, if the installed API differs slightly.)

```ts
export class AuthMiddleware extends RpcMiddleware.Service<AuthMiddleware>()(
  "AuthMiddleware",
  { error: Unauthenticated, provides: CurrentSession },
) {}

function parseCookies(header: string | null): Record<string, string> {
  if (!header) return {};
  return Object.fromEntries(
    header.split(";").map((part) => {
      const [key, ...rest] = part.trim().split("=");
      return [key, rest.join("=")];
    }),
  );
}

export function makeAuthMiddlewareLayer(
  oauth: OAuthClient,
  cookieSecret: string,
): Layer.Layer<AuthMiddleware> {
  return Layer.succeed(
    AuthMiddleware,
    AuthMiddleware.of(({ headers }) =>
      Effect.gen(function* () {
        const cookies = parseCookies(headers["cookie"] ?? null);
        const cookieValue = cookies["pm_session"];
        if (!cookieValue) {
          return yield* Effect.fail(new Unauthenticated({}));
        }

        const did = yield* Effect.tryPromise({
          try: () => verifyDidCookie(cookieValue, cookieSecret),
          catch: () => new Unauthenticated({}),
        });
        if (!did) {
          return yield* Effect.fail(new Unauthenticated({}));
        }

        const session = yield* Effect.tryPromise({
          try: () => oauth.restore(did),
          catch: () => new Unauthenticated({}),
        });
        if (!session) {
          return yield* Effect.fail(new Unauthenticated({}));
        }

        return CurrentSession.of({ did });
      }),
    ),
  );
}
```

This task has no unit test of its own — it's pure wiring over two already-tested pieces (`verifyDidCookie`, `oauth.restore`) and the real behavior only matters once it's attached to a live RPC group with real headers, which Task 10's smoke test exercises end to end. Writing a mocked-middleware test here would just re-assert the two functions it calls, which are already covered.

- [ ] **Step 4: Commit**

Stage `auth_middleware.ts` and stop short of committing.

---

### Task 8: AtprotoRepo service (repo CRUD + blob upload)

**Files:**
- Create: `workers/atproto-persistence/src/repo.ts`
- Create: `workers/atproto-persistence/src/repo.test.ts`

**Interfaces:**
- Consumes: `@atcute/client`'s `Client`; an `OAuthSession` (returned by `oauth.restore(did)` in Task 6).
- Produces: `AtprotoRepo` Effect service with `listMaps(session)`, `getMap(session, rkey)`, `putMap(session, rkey, record, blobBytes)`, `deleteMap(session, rkey)` — Task 9 (RPC handlers) depends on these four method names and signatures.

`com.atproto.repo.uploadBlob`'s exact content-type parameter wasn't confirmed by research (flagged explicitly) — Step 1 below checks it against the installed package before the implementation step relies on it.

- [ ] **Step 1: Confirm `uploadBlob`'s call shape against installed types**

Run: `cd workers/atproto-persistence && pnpm add @atcute/client @atcute/atproto` (if not already present from Task 6).

Open `node_modules/@atcute/client/dist/client.ts` (or `.d.ts` if source isn't shipped) and find the `post()` method's signature for a binary `input` — confirm whether content type is set via a `headers` option, an `encoding`/`contentType` option, or inferred automatically from a `Blob`/`File` passed as `input`. Adjust Step 3 below to match.

- [ ] **Step 2: Write the failing test**

Test against a fake XRPC handler (no real network) that records calls and returns canned responses — this verifies `AtprotoRepo` constructs the right collection/rkey/record shapes, not atcute's own HTTP behavior.

```ts
// workers/atproto-persistence/src/repo.test.ts
import { describe, expect, it, vi } from "vitest";
import { Effect } from "effect";
import { Client } from "@atcute/client";
import { AtprotoRepo, AtprotoRepoLive } from "./repo";

const COLLECTION = "io.placemark.map";

function fakeClient(responses: Record<string, unknown>) {
  const calls: Array<{ method: string; nsid: string; args: unknown }> = [];
  return {
    client: {
      post: vi.fn(async (nsid: string, args: unknown) => {
        calls.push({ method: "post", nsid, args });
        return { ok: true, data: responses[nsid] };
      }),
      get: vi.fn(async (nsid: string, args: unknown) => {
        calls.push({ method: "get", nsid, args });
        return { ok: true, data: responses[nsid] };
      }),
    } as unknown as Client,
    calls,
  };
}

describe("AtprotoRepo", () => {
  it("lists maps for a DID", async () => {
    const { client, calls } = fakeClient({
      "com.atproto.repo.listRecords": {
        records: [
          {
            uri: "at://did:plc:abc/io.placemark.map/3a",
            cid: "bafy1",
            value: { name: "Trip", updatedAt: "2026-10-07T00:00:00.000Z" },
          },
        ],
      },
    });

    const program = Effect.gen(function* () {
      const repo = yield* AtprotoRepo;
      return yield* repo.listMaps("did:plc:abc");
    }).pipe(Effect.provide(AtprotoRepoLive(client)));

    const result = await Effect.runPromise(program);
    expect(result).toStrictEqual([
      { rkey: "3a", name: "Trip", updatedAt: "2026-10-07T00:00:00.000Z" },
    ]);
    expect(calls[0]).toMatchObject({
      nsid: "com.atproto.repo.listRecords",
      args: { params: { repo: "did:plc:abc", collection: COLLECTION } },
    });
  });

  it("puts a map record with a blob ref", async () => {
    const { client, calls } = fakeClient({
      "com.atproto.repo.uploadBlob": { blob: { $type: "blob", ref: "fake-ref" } },
      "com.atproto.repo.putRecord": { uri: "at://did:plc:abc/io.placemark.map/3a", cid: "bafy2" },
    });

    const program = Effect.gen(function* () {
      const repo = yield* AtprotoRepo;
      return yield* repo.putMap(
        "did:plc:abc",
        "3a",
        { name: "Trip", symbolization: {}, layer: null, folders: [], layerConfigs: [] },
        new Uint8Array([1, 2, 3]),
      );
    }).pipe(Effect.provide(AtprotoRepoLive(client)));

    await Effect.runPromise(program);

    const putCall = calls.find((call) => call.nsid === "com.atproto.repo.putRecord");
    expect(putCall?.args).toMatchObject({
      input: {
        repo: "did:plc:abc",
        collection: COLLECTION,
        rkey: "3a",
        record: { name: "Trip", data: { $type: "blob", ref: "fake-ref" } },
      },
    });
  });
});
```

- [ ] **Step 3: Run it to confirm it fails**

Run: `cd workers/atproto-persistence && pnpm vitest run src/repo.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 4: Implement**

```ts
// workers/atproto-persistence/src/repo.ts
import { Context, Effect, Layer } from "effect";
import type { Client } from "@atcute/client";
import { CloudMapSummary, RecordNotFound } from "shared/atproto_rpc";

const COLLECTION = "io.placemark.map";

export interface MapRecordInput {
  name: string;
  symbolization: unknown;
  layer: unknown;
  folders: unknown;
  layerConfigs: unknown;
}

export interface MapRecordOutput extends MapRecordInput {
  dataBlobRef: unknown;
}

export interface AtprotoRepoShape {
  listMaps(did: string): Effect.Effect<CloudMapSummary[]>;
  getMap(did: string, rkey: string): Effect.Effect<MapRecordOutput, RecordNotFound>;
  putMap(
    did: string,
    rkey: string,
    record: MapRecordInput,
    blobBytes: Uint8Array,
  ): Effect.Effect<CloudMapSummary>;
  deleteMap(did: string, rkey: string): Effect.Effect<void>;
}

export class AtprotoRepo extends Context.Tag("AtprotoRepo")<
  AtprotoRepo,
  AtprotoRepoShape
>() {}

function rkeyFromUri(uri: string): string {
  const parts = uri.split("/");
  return parts[parts.length - 1];
}

export function AtprotoRepoLive(client: Client): Layer.Layer<AtprotoRepo> {
  return Layer.succeed(AtprotoRepo, {
    listMaps: (did) =>
      Effect.promise(async () => {
        const response = await client.get("com.atproto.repo.listRecords", {
          params: { repo: did, collection: COLLECTION },
        });
        const records = (response.data as { records: Array<{ uri: string; value: { name: string; updatedAt: string } }> }).records;
        return records.map(
          (record) =>
            new CloudMapSummary({
              rkey: rkeyFromUri(record.uri),
              name: record.value.name,
              updatedAt: record.value.updatedAt,
            }),
        );
      }),

    getMap: (did, rkey) =>
      Effect.tryPromise({
        try: async () => {
          const response = await client.get("com.atproto.repo.getRecord", {
            params: { repo: did, collection: COLLECTION, rkey },
          });
          if (!response.ok) {
            throw new RecordNotFound({ rkey });
          }
          const value = (response as { data: { value: MapRecordInput & { data: unknown } } }).data
            .value;
          return { ...value, dataBlobRef: value.data };
        },
        catch: () => new RecordNotFound({ rkey }),
      }),

    putMap: (did, rkey, record, blobBytes) =>
      Effect.promise(async () => {
        const uploadResponse = await client.post("com.atproto.repo.uploadBlob", {
          input: blobBytes,
        });
        const blobRef = (uploadResponse.data as { blob: unknown }).blob;

        await client.post("com.atproto.repo.putRecord", {
          input: {
            repo: did,
            collection: COLLECTION,
            rkey,
            record: {
              $type: COLLECTION,
              name: record.name,
              updatedAt: new Date().toISOString(),
              data: blobRef,
              symbolization: record.symbolization,
              layer: record.layer,
              folders: record.folders,
              layerConfigs: record.layerConfigs,
            },
          },
        });

        return new CloudMapSummary({
          rkey,
          name: record.name,
          updatedAt: new Date().toISOString(),
        });
      }),

    deleteMap: (did, rkey) =>
      Effect.promise(async () => {
        await client.post("com.atproto.repo.deleteRecord", {
          input: { repo: did, collection: COLLECTION, rkey },
        });
      }),
  });
}
```

Adjust the `uploadBlob` call's `input`/content-type shape per whatever Step 1 found before trusting this — the test above only checks that `putRecord` receives the right record shape, not that `uploadBlob`'s own call matches `@atcute/client`'s real signature (that part can't be verified without the installed types).

- [ ] **Step 5: Run tests to confirm they pass**

Run: `cd workers/atproto-persistence && pnpm vitest run src/repo.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

Stage `repo.ts`, `repo.test.ts` and stop short of committing.

---

### Task 9: RPC handlers (Map CRUD)

**Files:**
- Create: `workers/atproto-persistence/src/handlers.ts`
- Create: `workers/atproto-persistence/src/handlers.test.ts`

**Interfaces:**
- Consumes: `MapRpcs` (Task 2), `AtprotoRepo` (Task 8), `CurrentSession`/`AuthMiddleware` (Task 7), `encodeFeaturesToFlatGeobuf`/`decodeFlatGeobufToFeatures` are **not** used here (those run frontend-side per Task 3's design) — this layer only base64-decodes/encodes the already-FlatGeobuf-encoded bytes it's handed.
- Produces: `MapHandlersLive: Layer.Layer<Rpc.ToHandler<typeof MapRpcs.Rpcs>, never, AtprotoRepo>` — Task 10 (worker entrypoint) provides this layer alongside `AtprotoRepoLive` and `makeAuthMiddlewareLayer`.

- [ ] **Step 1: Write the failing test**

```ts
// workers/atproto-persistence/src/handlers.test.ts
import { describe, expect, it } from "vitest";
import { Effect, Layer } from "effect";
import { AtprotoRepo, type AtprotoRepoShape } from "./repo";
import { CurrentSession } from "./auth_middleware";
import { MapRpcs, CloudMapSummary, RecordNotFound } from "shared/atproto_rpc";
import { MapHandlersLive } from "./handlers";

function fakeRepo(overrides: Partial<AtprotoRepoShape>): Layer.Layer<AtprotoRepo> {
  return Layer.succeed(AtprotoRepo, {
    listMaps: () => Effect.succeed([]),
    getMap: () => Effect.fail(new RecordNotFound({ rkey: "missing" })),
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

    const handlerLayer = MapHandlersLive.pipe(Layer.provide(repo));
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const handlers = yield* Layer.build(handlerLayer);
        const impl = handlers.pipe();
        return impl;
      }).pipe(Effect.scoped),
    ).catch(() => null);

    // This test asserts the handler layer builds successfully with a given
    // CurrentSession in context — full request-level behavior (cookie in,
    // JSON out) is covered by Task 10's wrangler-dev smoke test, since that's
    // the only place a real HTTP round trip exists to assert against.
    expect(result).not.toBeNull();
  });

  it("LoadMap surfaces RecordNotFound from the repo", async () => {
    const repo = fakeRepo({ getMap: () => Effect.fail(new RecordNotFound({ rkey: "3a" })) });
    const handlerLayer = MapHandlersLive.pipe(Layer.provide(repo));
    const built = await Effect.runPromise(Layer.build(handlerLayer).pipe(Effect.scoped)).catch(
      () => null,
    );
    expect(built).not.toBeNull();
  });
});
```

(This test is intentionally light — it checks the handler layer is well-typed and buildable against a given `AtprotoRepo`/`CurrentSession`, since actually invoking an `Rpc.ToHandler` map by hand outside a running `RpcServer` isn't a well-documented pattern and isn't worth reverse-engineering; Task 10's `curl`-based smoke test is where real request/response behavior gets exercised.)

- [ ] **Step 2: Run it to confirm it fails**

Run: `cd workers/atproto-persistence && pnpm vitest run src/handlers.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement**

```ts
// workers/atproto-persistence/src/handlers.ts
import { Effect, Layer } from "effect";
import { AtprotoRepo } from "./repo";
import { CurrentSession } from "./auth_middleware";
import { MapRpcs, Unauthenticated } from "shared/atproto_rpc";

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
          const bytes = Uint8Array.from(atob(doc.dataBase64), (char) => char.charCodeAt(0));
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
          return {
            dataBase64: btoa(
              String.fromCharCode(...new Uint8Array(record.dataBlobRef as ArrayBuffer)),
            ),
            symbolization: record.symbolization,
            layer: record.layer,
            folders: record.folders,
            layerConfigs: record.layerConfigs,
          };
        }),

      UpdateMap: ({ rkey, name, doc }) =>
        Effect.gen(function* () {
          const session = yield* CurrentSession;
          const existing = yield* repo.getMap(session.did, rkey);
          const bytes = Uint8Array.from(atob(doc.dataBase64), (char) => char.charCodeAt(0));
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
```

`LoadMap`'s blob-fetch step (turning `record.dataBlobRef` into actual bytes, rather than just the blob *reference*) depends on whichever `com.atproto.sync.getBlob`-style call `AtprotoRepo.getMap` ends up needing once Task 8's Step 1 verification is done — if `getMap` doesn't already resolve the blob to bytes internally, add that call to `repo.ts`'s `getMap` implementation (not here) so this handler can stay focused on shaping the RPC response.

- [ ] **Step 4: Run tests to confirm they pass**

Run: `cd workers/atproto-persistence && pnpm vitest run src/handlers.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

Stage `handlers.ts`, `handlers.test.ts` and stop short of committing.

---

### Task 10: Worker entrypoint — plain routes + RPC adapter

**Files:**
- Modify: `workers/atproto-persistence/src/index.ts`

**Interfaces:**
- Consumes: everything from Tasks 2–9.
- Produces: the deployed Worker's actual public surface — `GET /oauth/client-metadata.json`, `POST /oauth/login`, `GET /oauth/callback`, and `POST /rpc`.

- [ ] **Step 1: Implement the entrypoint**

```ts
// workers/atproto-persistence/src/index.ts
import { Effect, Layer } from "effect";
import { HttpServerRequest, HttpServerResponse } from "effect/http";
import { RpcServer, RpcSerialization } from "effect/rpc";
import { Client } from "@atcute/client";
import type { Env } from "./env";
import { OAuthStateDO } from "./durable-objects/oauth_state_do";
import { SessionDO } from "./durable-objects/session_do";
import { buildOAuthClient } from "./oauth";
import { AtprotoRepoLive } from "./repo";
import { makeAuthMiddlewareLayer } from "./auth_middleware";
import { MapHandlersLive } from "./handlers";
import { MapRpcs } from "shared/atproto_rpc";
import { signDidCookie } from "./cookie";

export { OAuthStateDO, SessionDO };

function baseUrlFor(request: Request): string {
  return new URL(request.url).origin;
}

async function handleClientMetadata(request: Request, env: Env): Promise<Response> {
  const oauth = buildOAuthClient(env, baseUrlFor(request));
  return Response.json(oauth.metadata);
}

async function handleLogin(request: Request, env: Env): Promise<Response> {
  const oauth = buildOAuthClient(env, baseUrlFor(request));
  const { handle } = (await request.json()) as { handle: string };
  const { url } = await oauth.authorize({
    target: { type: "account", identifier: handle },
    state: { returnTo: "/" },
  });
  return Response.redirect(url.toString(), 302);
}

async function handleCallback(request: Request, env: Env): Promise<Response> {
  const oauth = buildOAuthClient(env, baseUrlFor(request));
  const url = new URL(request.url);
  const { session } = await oauth.callback(url.searchParams);
  const cookieValue = await signDidCookie(session.did, env.COOKIE_SECRET);

  return new Response(null, {
    status: 302,
    headers: {
      Location: "/",
      "Set-Cookie": `pm_session=${cookieValue}; HttpOnly; Secure; SameSite=Lax; Path=/`,
    },
  });
}

async function handleRpc(request: Request, env: Env): Promise<Response> {
  const oauth = buildOAuthClient(env, baseUrlFor(request));

  // One restored OAuthSession can't be known until the auth middleware runs
  // inside the Effect program (it needs the cookie, which needs `headers`),
  // so the repo layer is built from a session-bound `Client` the middleware
  // constructs on demand — see auth_middleware.ts's use of `oauth.restore`.
  const program = Effect.gen(function* () {
    const httpEffect = yield* RpcServer.toHttpEffect(MapRpcs);
    return yield* httpEffect;
  }).pipe(
    Effect.provideService(HttpServerRequest.HttpServerRequest, HttpServerRequest.fromWeb(request)),
    Effect.scoped,
    Effect.provide(
      Layer.mergeAll(
        MapHandlersLive,
        RpcSerialization.layerJson,
        makeAuthMiddlewareLayer(oauth, env.COOKIE_SECRET),
        AtprotoRepoLive(new Client({ handler: oauth })),
      ),
    ),
  );

  const response = await Effect.runPromise(program);
  return HttpServerResponse.toWeb(response);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/oauth/client-metadata.json") {
      return handleClientMetadata(request, env);
    }
    if (request.method === "POST" && url.pathname === "/oauth/login") {
      return handleLogin(request, env);
    }
    if (request.method === "GET" && url.pathname === "/oauth/callback") {
      return handleCallback(request, env);
    }
    if (request.method === "POST" && url.pathname === "/rpc") {
      return handleRpc(request, env);
    }

    return new Response("not found", { status: 404 });
  },
};
```

`AtprotoRepoLive(new Client({ handler: oauth }))` is almost certainly wrong as written — `oauth` (the `OAuthClient`) isn't itself a per-request, per-DID authenticated handler; Task 6's research showed `oauth.restore(did)` returns the thing `Client`'s `handler` option expects, and that call needs a `did`, which isn't known until the auth middleware resolves the cookie. Resolve this ordering problem as part of this task's work, not by deferring it:

- [ ] **Step 2: Fix the session/repo wiring order**

The real flow has to be: middleware resolves `did` from the cookie → middleware (or a step right after it) calls `oauth.restore(did)` to get the `OAuthSession` → **that** is what builds the per-request `Client`/`AtprotoRepo` layer, not a Worker-wide one built before the request's cookie is even read. Restructure so `AtprotoRepoLive` is constructed *inside* the auth middleware's `Effect.gen` (where `oauth.restore(did)` is already being called in Task 7's `auth_middleware.ts`) and provided from there via `Layer.succeed` scoped to that request, rather than built once in `index.ts` before the cookie is known. Update `auth_middleware.ts` to additionally build and provide `AtprotoRepo` (not just `CurrentSession`) and remove the premature `AtprotoRepoLive(...)` construction from `index.ts`. Re-run Task 9's `handlers.test.ts` after this change to confirm the handlers still only depend on `AtprotoRepo` and `CurrentSession` as separate concerns (so this restructuring doesn't ripple into the handlers themselves — it's purely about which layer, `index.ts` or `auth_middleware.ts`, is responsible for producing `AtprotoRepo`).

- [ ] **Step 3: Deploy smoke test**

Set the two secrets (if not already done in Task 6):
```
wrangler secret put OAUTH_SIGNING_KEY
wrangler secret put COOKIE_SECRET
```

Run: `pnpm run dev`, then:
```
curl http://localhost:8787/oauth/client-metadata.json
```
Expected: JSON body with `client_id` and `redirect_uris` fields.

```
curl -X POST http://localhost:8787/oauth/login -d '{"handle":"your-test-handle.bsky.social"}'
```
Expected: a `302` with a `Location` header pointing at a real PDS's `/oauth/authorize` endpoint — confirms identity resolution + PAR actually complete end to end against a real PDS. This is the smoke test the design doc called for before trusting the rest of the OAuth flow; **actually clicking through** the redirect, approving on a real/test Bluesky account, and confirming the callback sets a cookie is a manual step to do once, not something to automate here.

- [ ] **Step 4: Commit**

Stage `index.ts` and whatever `auth_middleware.ts` changes resulted from Step 2, and stop short of committing.

---

### Task 11: Frontend `CloudProvider` interface and registry

**Files:**
- Create: `app/lib/cloud_providers/types.ts`
- Create: `app/lib/cloud_providers/index.ts`
- Modify: `app/lib/env_client.ts`

**Interfaces:**
- Produces: `CloudProvider` interface, `CLOUD_PROVIDERS: CloudProvider[]` — Task 12 (atproto implementation) and Task 14/15 (dialogs/menu) depend on this exact interface and registry export.

- [ ] **Step 1: Add the env var**

```ts
// app/lib/env_client.ts — add this line to the existing exported object
ATPROTO_PERSISTENCE_URL: import.meta.env.VITE_ATPROTO_PERSISTENCE_URL as string | undefined,
```

- [ ] **Step 2: Define the interface**

```ts
// app/lib/cloud_providers/types.ts
export interface CloudMapSummary {
  rkey: string;
  name: string;
  updatedAt: string;
}

export interface CloudMapDocument {
  dataBase64: string;
  symbolization: unknown;
  layer: unknown;
  folders: unknown;
  layerConfigs: unknown;
}

export interface CloudAuthState {
  status: "signed-out" | "signed-in";
  handle?: string;
}

export interface CloudProvider {
  id: string;
  label: string;
  useAuthState(): CloudAuthState;
  signIn(handle: string): void;
  signOut(): Promise<void>;
  listMaps(): Promise<CloudMapSummary[]>;
  saveMap(doc: CloudMapDocument, name: string): Promise<CloudMapSummary>;
  loadMap(rkey: string): Promise<CloudMapDocument>;
  updateMap(rkey: string, doc: CloudMapDocument, name?: string): Promise<CloudMapSummary>;
  deleteMap(rkey: string): Promise<void>;
}
```

- [ ] **Step 3: Define the registry**

```ts
// app/lib/cloud_providers/index.ts
import { ATPROTO_PERSISTENCE_URL } from "app/lib/env_client";
import type { CloudProvider } from "./types";

function loadProviders(): CloudProvider[] {
  const providers: CloudProvider[] = [];
  if (ATPROTO_PERSISTENCE_URL) {
    const { atprotoProvider } = require("./atproto/client") as typeof import("./atproto/client");
    providers.push(atprotoProvider(ATPROTO_PERSISTENCE_URL));
  }
  return providers;
}

export const CLOUD_PROVIDERS: CloudProvider[] = loadProviders();
```

The user's global rule prefers static imports over dynamic ones, but `require` here is deliberate and different from a dynamic `import()`: it's the mechanism that keeps the atproto provider (and its `effect`/RPC client bundle weight) out of the build entirely when the env var is unset, which is the explicit "fully absent unless configured" requirement from the design — a static `import` would always include the module in the bundle regardless of the env var. If bundler behavior makes this not tree-shake as expected once this is actually built and measured, switch to a Vite-specific conditional-import pattern instead (e.g. `import.meta.glob` with `eager: false`) rather than reaching for a plain dynamic `import()` that still can't be statically eliminated — re-confirm against this repo's actual Vite output (`pnpm build` + inspect the `dist/assets` bundle for atcute/effect) before considering this task done.

- [ ] **Step 4: Verify manually**

Run: `pnpm build` with `VITE_ATPROTO_PERSISTENCE_URL` unset, then `grep -r "atcute" dist/assets` — expect no matches (confirms tree-shaking). Then rebuild with the env var set to any placeholder URL and confirm the atproto client code does appear in `dist/assets`.

- [ ] **Step 5: Commit**

Stage the new files and `env_client.ts` and stop short of committing.

---

### Task 12: atproto `CloudProvider` implementation

**Files:**
- Create: `app/lib/cloud_providers/atproto/client.ts`

**Interfaces:**
- Consumes: `MapRpcs` (Task 2), `encodeFeaturesToFlatGeobuf`/`decodeFlatGeobufToFeatures` (Task 3), `CloudProvider` (Task 11).
- Produces: `atprotoProvider(baseUrl: string): CloudProvider` — called from Task 11's registry.

- [x] **Step 1: Implement**

```ts
// app/lib/cloud_providers/atproto/client.ts
import { Effect, Layer } from "effect";
import { FetchHttpClient } from "effect/http";
import { RpcClient, RpcSerialization } from "effect/rpc";
import { useEffect, useState } from "react";
import { MapRpcs } from "shared/atproto_rpc";
import type { CloudAuthState, CloudMapDocument, CloudMapSummary, CloudProvider } from "../types";

function makeClientLayer(baseUrl: string) {
  return RpcClient.layerProtocolHttp({ url: `${baseUrl}/rpc` }).pipe(
    Layer.provide(FetchHttpClient.layer),
    Layer.provide(RpcSerialization.layerJson),
  );
}

function runRpc<A, E>(
  baseUrl: string,
  program: (client: RpcClient.RpcClient<typeof MapRpcs.Rpcs>) => Effect.Effect<A, E>,
): Promise<A> {
  return Effect.runPromise(
    Effect.gen(function* () {
      const client = yield* RpcClient.make(MapRpcs);
      return yield* program(client);
    }).pipe(Effect.provide(makeClientLayer(baseUrl))),
  );
}

export function atprotoProvider(baseUrl: string): CloudProvider {
  return {
    id: "atproto",
    label: "Bluesky",

    useAuthState(): CloudAuthState {
      const [state, setState] = useState<CloudAuthState>({ status: "signed-out" });

      useEffect(() => {
        let cancelled = false;
        runRpc(baseUrl, (client) => client.Me())
          .then((me) => {
            if (!cancelled) setState({ status: "signed-in", handle: me.handle });
          })
          .catch(() => {
            if (!cancelled) setState({ status: "signed-out" });
          });
        return () => {
          cancelled = true;
        };
      }, []);

      return state;
    },

    signIn(handle: string) {
      void fetch(`${baseUrl}/oauth/login`, {
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ handle }),
      }).then((response) => {
        if (response.redirected) {
          window.location.href = response.url;
        }
      });
    },

    async signOut() {
      await runRpc(baseUrl, (client) => client.Logout());
    },

    async listMaps(): Promise<CloudMapSummary[]> {
      return runRpc(baseUrl, (client) => client.ListMaps());
    },

    async saveMap(doc: CloudMapDocument, name: string): Promise<CloudMapSummary> {
      return runRpc(baseUrl, (client) => client.SaveMap({ name, doc }));
    },

    async loadMap(rkey: string): Promise<CloudMapDocument> {
      return runRpc(baseUrl, (client) => client.LoadMap({ rkey }));
    },

    async updateMap(rkey: string, doc: CloudMapDocument, name?: string): Promise<CloudMapSummary> {
      return runRpc(baseUrl, (client) => client.UpdateMap({ rkey, name, doc }));
    },

    async deleteMap(rkey: string): Promise<void> {
      await runRpc(baseUrl, (client) => client.DeleteMap({ rkey }));
    },
  };
}
```

`signIn`'s `fetch(..., { redirect: "follow" })` default won't actually let the browser land on the PDS's real login page the way a top-level navigation would (a `fetch`-followed redirect stays within the fetch, it doesn't navigate the tab) — the `response.redirected`/`window.location.href` fallback here is a workaround, not confirmed to behave correctly cross-origin. The more standard approach is a plain top-level navigation instead of `fetch`:

- [x] **Step 2: Fix sign-in to use a real navigation, not fetch**

```ts
    signIn(handle: string) {
      const form = document.createElement("form");
      form.method = "POST";
      form.action = `${baseUrl}/oauth/login`;
      form.style.display = "none";

      const input = document.createElement("input");
      input.type = "hidden";
      input.name = "handle";
      input.value = handle;
      form.appendChild(input);

      document.body.appendChild(form);
      form.submit();
    },
```

This requires `handleLogin` in the Worker (Task 10) to read `handle` from a form-encoded body instead of JSON — update `workers/atproto-persistence/src/index.ts`'s `handleLogin` to parse `await request.formData()` and read `.get("handle")` instead of `request.json()`, since a real `<form>` POST submits `application/x-www-form-urlencoded`, not JSON.

- [ ] **Step 3: Manual verification**

This can't be meaningfully unit-tested without a running Worker (Task 10's deploy) and a real atproto handle — defer verifying this end to end to Task 15's manual QA pass, once the dialogs exist to drive it from the UI.

- [x] **Step 4: Commit**

Stage `client.ts` and the `index.ts` form-data change from Step 2, and stop short of committing.

---

### Task 13: Load a cloud map into the editor

**Files:**
- Create: `app/lib/cloud_providers/atproto/load_into_editor.ts`

**Interfaces:**
- Consumes: `decodeFlatGeobufToFeatures` (Task 3), `dataAtom`/`layerConfigAtom`/`memoryMetaAtom`/`momentLogAtom` (`state/jotai`), `CMomentLog` (`app/lib/persistence/moment`).
- Produces: `useLoadCloudMapIntoEditor(): (doc: CloudMapDocument, name: string) => Promise<void>` — Task 15's "Open" action depends on this hook.

This bypasses `IPersistence`/`useTransact` entirely and replaces the in-memory document wholesale — consistent with the design's decision that cloud save/open is a snapshot operation layered on top of the editor, not a live persistence backend. It also clears undo history, since opening a different map isn't something the current map's undo stack should apply to.

- [x] **Step 1: Implement**

```ts
// app/lib/cloud_providers/atproto/load_into_editor.ts
import { useAtomCallback } from "jotai/utils";
import { useCallback } from "react";
import { CMomentLog } from "app/lib/persistence/moment";
import { dataAtom, layerConfigAtom, memoryMetaAtom, momentLogAtom } from "state/jotai";
import type { IFolder, ILayerConfig } from "types";
import type { CloudMapDocument } from "../types";
import { decodeFlatGeobufToFeatures } from "./fgb_codec";

export function useLoadCloudMapIntoEditor() {
  return useAtomCallback(
    useCallback(async (_get, set, doc: CloudMapDocument, name: string) => {
      const bytes = Uint8Array.from(atob(doc.dataBase64), (char) => char.charCodeAt(0));
      const features = await decodeFlatGeobufToFeatures(bytes);
      const folders = doc.folders as IFolder[];
      const layerConfigs = doc.layerConfigs as ILayerConfig[];

      set(dataAtom, {
        featureMap: new Map(features.map((feature) => [feature.id, feature])),
        folderMap: new Map(folders.map((folder) => [folder.id, folder])),
        selection: { type: "none" },
      });

      set(layerConfigAtom, new Map(layerConfigs.map((config) => [config.id, config])));

      set(memoryMetaAtom, {
        symbolization: doc.symbolization as (typeof memoryMetaAtom extends never ? never : Parameters<typeof set>[1])["symbolization"],
        label: name,
        layer: doc.layer,
      });

      set(momentLogAtom, new CMomentLog());
    }, []),
  );
}
```

The `memoryMetaAtom` cast above is circular nonsense — fix it directly rather than carrying it forward:

- [x] **Step 2: Fix the memoryMetaAtom typing**

```ts
// replace the set(memoryMetaAtom, ...) call with:
      set(memoryMetaAtom, {
        symbolization: doc.symbolization as ISymbolization,
        label: name,
        layer: doc.layer,
      });
```

This one `as ISymbolization` is a genuine boundary cast (an opaque `unknown` coming back over the wire, same as any deserialized network payload), not an avoidable one — add `import { tryUpgrading } from "types"` and run `doc.symbolization` through `tryUpgrading(doc.symbolization).orDefault(SYMBOLIZATION_NONE)` instead if you want to avoid the cast entirely, since this app already has a real Maybe-returning validator for exactly this shape (`tryUpgrading` in `types/index.ts:251`) rather than trusting the wire payload blindly.

- [x] **Step 3: Apply the `tryUpgrading` fix for real (no cast)**

```ts
// app/lib/cloud_providers/atproto/load_into_editor.ts
import { useAtomCallback } from "jotai/utils";
import { useCallback } from "react";
import { CMomentLog } from "app/lib/persistence/moment";
import { dataAtom, layerConfigAtom, memoryMetaAtom, momentLogAtom } from "state/jotai";
import { type IFolder, type ILayerConfig, SYMBOLIZATION_NONE, tryUpgrading } from "types";
import type { CloudMapDocument } from "../types";
import { decodeFlatGeobufToFeatures } from "./fgb_codec";

export function useLoadCloudMapIntoEditor() {
  return useAtomCallback(
    useCallback(async (_get, set, doc: CloudMapDocument, name: string) => {
      const bytes = Uint8Array.from(atob(doc.dataBase64), (char) => char.charCodeAt(0));
      const features = await decodeFlatGeobufToFeatures(bytes);
      const folders = doc.folders as IFolder[];
      const layerConfigs = doc.layerConfigs as ILayerConfig[];

      set(dataAtom, {
        featureMap: new Map(features.map((feature) => [feature.id, feature])),
        folderMap: new Map(folders.map((folder) => [folder.id, folder])),
        selection: { type: "none" },
      });

      set(layerConfigAtom, new Map(layerConfigs.map((config) => [config.id, config])));

      set(memoryMetaAtom, {
        symbolization: tryUpgrading(doc.symbolization).orDefault(SYMBOLIZATION_NONE),
        label: name,
        layer: doc.layer,
      });

      set(momentLogAtom, new CMomentLog());
    }, []),
  );
}
```

`folders`/`layerConfigs` still use `as IFolder[]`/`as ILayerConfig[]` — these don't have an equivalent `tryUpgrading`-style runtime validator in this codebase today. Leave the casts for now (consistent with "no placeholders" meaning real, working code — not inventing new validators this task doesn't need) but note it as a follow-up if this ever needs to defend against a malformed/attacker-controlled record (it doesn't today, since only the signed-in user's own session can read their own records back).

- [x] **Step 4: Commit**

Stage `load_into_editor.ts` and stop short of committing.

---

### Task 14: Sign-in dialog and menu entry

**Files:**
- Create: `app/components/dialogs/cloud_sign_in.tsx`
- Modify: `state/dialog_state.ts`
- Modify: `app/components/dialogs.tsx`
- Modify: `app/components/menu_bar/menu_bar_dropdown.tsx`

**Interfaces:**
- Consumes: `CLOUD_PROVIDERS` (Task 11), `DialogHeader`/`SimpleDialogActions`/`E.*` (existing `app/components/dialog.tsx`/`elements.tsx`, same as `export.tsx`).
- Produces: `dialogAtom`'s `{ type: "cloud_sign_in" }` / `{ type: "cloud_maps" }` states — Task 15 depends on `cloud_maps` already existing here.

- [x] **Step 1: Add dialog states**

```ts
// state/dialog_state.ts — add to the DialogState union:
  | { type: "cloud_sign_in" }
  | { type: "cloud_maps" }
```

- [x] **Step 2: Write the sign-in dialog**

```tsx
// app/components/dialogs/cloud_sign_in.tsx
import { DialogHeader } from "app/components/dialog";
import SimpleDialogActions from "app/components/dialogs/simple_dialog_actions";
import * as E from "app/components/elements";
import { CLOUD_PROVIDERS } from "app/lib/cloud_providers";
import { Field, Form, Formik } from "formik";

export function CloudSignInDialog({ onClose }: { onClose: () => void }) {
  const provider = CLOUD_PROVIDERS[0];

  return (
    <>
      <DialogHeader title={`Sign in with ${provider.label}`} />
      <Formik
        initialValues={{ handle: "" }}
        onSubmit={({ handle }) => {
          provider.signIn(handle);
        }}
      >
        <Form>
          <div className="space-y-4">
            <label className="block">
              <div>
                <E.StyledLabelSpan>Handle</E.StyledLabelSpan>
              </div>
              <Field
                className={E.styledTextInput({ size: "sm" })}
                name="handle"
                placeholder="you.bsky.social"
              />
            </label>
            <SimpleDialogActions onClose={onClose} action="Sign in" />
          </div>
        </Form>
      </Formik>
    </>
  );
}
```

(If `E.styledTextInput`/`E.StyledLabelSpan` aren't the exact export names in `app/components/elements.tsx`, grep that file for the real names used by other dialogs' text fields before assuming these — `export.tsx`'s own inputs are all `select`/`checkbox` fields, which don't establish the plain-text-input convention this dialog needs.)

- [x] **Step 3: Wire the dialog switch**

```tsx
// app/components/dialogs.tsx — add imports and a .with() branch
import { CloudSignInDialog } from "app/components/dialogs/cloud_sign_in";
import { CloudMapsDialog } from "app/components/dialogs/cloud_maps"; // from Task 15

// inside the match(dialog) chain, alongside the existing `.with({ type: "export" }, ...)`:
    .with({ type: "cloud_sign_in" }, () => <CloudSignInDialog onClose={onClose} />)
    .with({ type: "cloud_maps" }, () => <CloudMapsDialog onClose={onClose} />)
```

(Task 15 creates `cloud_maps.tsx` — if executing these tasks out of order, stub it with a one-line placeholder component first so this file still compiles, then replace the stub in Task 15.)

- [x] **Step 4: Add the menu entry, gated on CLOUD_PROVIDERS**

```tsx
// app/components/menu_bar/menu_bar_dropdown.tsx — add near the other DD.Root sections
import { CLOUD_PROVIDERS } from "app/lib/cloud_providers";

function CloudMenu() {
  if (CLOUD_PROVIDERS.length === 0) return null;
  const setDialogState = useSetAtom(dialogAtom);
  const provider = CLOUD_PROVIDERS[0];
  const authState = provider.useAuthState();

  return (
    <>
      <DDSeparator />
      <DDLabel>{provider.label}</DDLabel>
      {authState.status === "signed-out" ? (
        <StyledItem onSelect={() => setDialogState({ type: "cloud_sign_in" })}>
          Sign in with {provider.label}
        </StyledItem>
      ) : (
        <StyledItem onSelect={() => setDialogState({ type: "cloud_maps" })}>
          My maps…
        </StyledItem>
      )}
    </>
  );
}
```

Call `<CloudMenu />` from within `MenuBarDropdown`'s existing `DDContent` (wherever the other menu sections live in that file — place it after the undo/theme sections already shown in the excerpt read earlier, before the closing `</DDContent>`).

- [ ] **Step 5: Manual verification**

Run `pnpm dev`, confirm no "Bluesky"/cloud entries appear anywhere with `VITE_ATPROTO_PERSISTENCE_URL` unset. Set the env var to any non-empty string, restart, confirm the menu entry now appears and opens the sign-in dialog (actually completing sign-in requires Task 10's Worker to be running and reachable at that URL — not required for this step, just that the dialog renders and the form attempts to submit).

- [x] **Step 6: Commit**

Stage all four files and stop short of committing.

---

### Task 15: "My Maps" dialog (list, save, open, delete)

**Files:**
- Create: `app/components/dialogs/cloud_maps.tsx`

**Interfaces:**
- Consumes: `CLOUD_PROVIDERS` (Task 11), `useLoadCloudMapIntoEditor` (Task 13), `dataAtom`/`layerConfigAtom`/`memoryMetaAtom` (`state/jotai`), `encodeFeaturesToFlatGeobuf` (Task 3).

- [x] **Step 1: Implement**

```tsx
// app/components/dialogs/cloud_maps.tsx
import { DialogHeader } from "app/components/dialog";
import * as E from "app/components/elements";
import { CLOUD_PROVIDERS } from "app/lib/cloud_providers";
import type { CloudMapSummary } from "app/lib/cloud_providers/types";
import { encodeFeaturesToFlatGeobuf } from "app/lib/cloud_providers/atproto/fgb_codec";
import { useLoadCloudMapIntoEditor } from "app/lib/cloud_providers/atproto/load_into_editor";
import { useAtomValue } from "jotai";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { dataAtom, layerConfigAtom, memoryMetaAtom } from "state/jotai";

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

export function CloudMapsDialog({ onClose }: { onClose: () => void }) {
  const provider = CLOUD_PROVIDERS[0];
  const data = useAtomValue(dataAtom);
  const layerConfigs = useAtomValue(layerConfigAtom);
  const meta = useAtomValue(memoryMetaAtom);
  const loadIntoEditor = useLoadCloudMapIntoEditor();

  const [maps, setMaps] = useState<CloudMapSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveName, setSaveName] = useState(meta.label ?? "");

  useEffect(() => {
    provider
      .listMaps()
      .then(setMaps)
      .finally(() => setLoading(false));
  }, [provider]);

  async function handleSave() {
    const bytes = await encodeFeaturesToFlatGeobuf(Array.from(data.featureMap.values()));
    const doc = {
      dataBase64: toBase64(bytes),
      symbolization: meta.symbolization,
      layer: meta.layer,
      folders: Array.from(data.folderMap.values()),
      layerConfigs: Array.from(layerConfigs.values()),
    };
    const summary = await provider.saveMap(doc, saveName || "Untitled map");
    setMaps((current) => [summary, ...current.filter((map) => map.rkey !== summary.rkey)]);
    toast.success("Saved");
  }

  async function handleOpen(rkey: string) {
    const doc = await provider.loadMap(rkey);
    const summary = maps.find((map) => map.rkey === rkey);
    await loadIntoEditor(doc, summary?.name ?? "Untitled map");
    toast.success("Opened");
    onClose();
  }

  async function handleDelete(rkey: string) {
    await provider.deleteMap(rkey);
    setMaps((current) => current.filter((map) => map.rkey !== rkey));
  }

  return (
    <>
      <DialogHeader title="My maps" />
      <div className="space-y-4">
        <div className="flex gap-x-2">
          <input
            className={E.styledTextInput({ size: "sm" })}
            value={saveName}
            onChange={(event) => setSaveName(event.target.value)}
            placeholder="Map name"
          />
          <E.Button onClick={handleSave}>Save current map</E.Button>
        </div>
        {loading ? (
          <E.TextWell>Loading…</E.TextWell>
        ) : maps.length === 0 ? (
          <E.TextWell>No saved maps yet.</E.TextWell>
        ) : (
          <ul className="space-y-1">
            {maps.map((map) => (
              <li key={map.rkey} className="flex items-center justify-between">
                <button type="button" className="text-left underline" onClick={() => handleOpen(map.rkey)}>
                  {map.name}
                </button>
                <E.Button size="xs" variant="destructive" onClick={() => handleDelete(map.rkey)}>
                  Delete
                </E.Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
```

(As with Task 14's dialog, verify `E.styledTextInput`/`E.Button`'s real prop names — `variant`/`size` values in particular — against `app/components/elements.tsx` directly before trusting this snippet verbatim; `export.tsx`'s usage of `E.Button` without a `variant` prop suggests `destructive` may not be a real variant name there, confirm before using it.)

- [x] **Step 2: Replace the Task 14 stub (if one was added) with this real import in `dialogs.tsx`**

Confirm `app/components/dialogs.tsx`'s `.with({ type: "cloud_maps" }, ...)` branch now points at this real `CloudMapsDialog`, not a placeholder.

- [ ] **Step 3: Manual end-to-end verification**

With Task 10's Worker running locally (`pnpm run dev` in `workers/atproto-persistence`) and `VITE_ATPROTO_PERSISTENCE_URL=http://localhost:8787` set for the frontend dev server:

1. Sign in with a real (or test) Bluesky handle, complete the OAuth approval on the PDS.
2. Draw a feature on the map, open "My maps", save it with a name.
3. Confirm the record appears in the signed-in account's PDS (e.g. via `https://pdsls.dev` or any atproto repo browser, looking for the `io.placemark.map` collection).
4. Clear the map, reopen "My maps", open the saved map, confirm the feature reappears.
5. Delete it from the dialog, confirm it's gone from both the dialog and the PDS.

This is the closing verification for every open risk flagged across the plan (OAuth-on-Workers, the `uploadBlob` call shape, the RpcMiddleware construction, the repo/session wiring order from Task 10) — don't consider the feature done until this passes against a real PDS, not just mocked tests.

- [x] **Step 4: Commit**

Stage `cloud_maps.tsx` and stop short of committing.

---

## Self-Review

**Spec coverage:** Overview/optionality → Tasks 11/14 (env-gated registry, menu gating). Architecture (Worker + 2 DOs + Effect services) → Tasks 1, 4, 6, 7, 8. Data model (lexicon record + FlatGeobuf blob, reserved-property folding) → Tasks 2, 3, 8. Auth flow (PAR/DPoP/confidential client/callback/cookie) → Tasks 5, 6, 10. API surface (plain routes + Effect RPC) → Tasks 2, 9, 10. Frontend plugin architecture → Tasks 11, 12, 13. Error handling (tagged errors crossing the wire) → Task 2, consumed throughout 7–10 and surfaced in 12. Testing strategy (unit-testable pure logic, manual PDS smoke test) → present in nearly every task; final closing pass in Task 15 Step 3. Deployment → Task 1, Task 10 Step 3.

**Placeholder scan:** No "TBD"/"TODO"/"implement later" strings. Every step has real code or a concrete, executable action (a shell command, a file to open and check). The three places flagged as genuinely uncertain against unverified APIs (`RpcMiddleware`'s server-construction call in Task 7, `uploadBlob`'s content-type param in Task 8, `OAuthClient`'s exact property shape in Task 6) each get an explicit "check the installed `.d.ts`, adjust accordingly" step rather than a vague hand-wave — this is a deliberate, scoped exception for genuinely-unverifiable-without-the-package facts, not a general escape hatch.

**Type consistency:** `CloudMapDocument`/`CloudMapSummary` fields match across `shared/atproto_rpc.ts` (Task 2), `app/lib/cloud_providers/types.ts` (Task 11), `repo.ts` (Task 8), and `handlers.ts` (Task 9) — `dataBase64`, `symbolization`, `layer`, `folders`, `layerConfigs` used identically everywhere. `AtprotoRepoShape`'s four method names (`listMaps`/`getMap`/`putMap`/`deleteMap`) match between Task 8's definition and Task 9's consumption. `CurrentSession`'s `{ did: string }` shape matches between Task 7's definition and Task 9's `CurrentSession` usage.

**Fix applied during review:** Task 10's first draft built `AtprotoRepoLive` before the per-request `did` was known, which can't work since `oauth.restore(did)` needs the cookie-derived DID first — Task 10 Step 2 calls this out explicitly and moves that construction into the auth middleware rather than leaving the contradiction for the implementer to discover.

---

Plan complete and saved to `docs/superpowers/plans/2026-10-07-atproto-persistence.md`.
