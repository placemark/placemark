# atproto-persistence

Worker that lets a signed-in Bluesky/atproto user save Placemark maps (FlatGeobuf blob + an `io.placemark.map` record) to their own PDS repo. Effect RPC at `POST /rpc`; atproto OAuth (confidential client) at `/oauth/*`. Saved maps are shareable: see "Sharing" below.

## Sharing

`io.placemark.map` records are ordinary atproto records, and atproto repo reads (`com.atproto.repo.getRecord`, `com.atproto.sync.getBlob`) are public protocol operations — anyone can read any record from any PDS. So a share link is just a pointer to `(did, rkey)`: no new storage, no permission layer, and no capability that isn't already protocol-public.

- The "My maps" dialog's link button copies `https://<app-origin>/?map=atproto/<did>/<rkey>`. The DID (not the handle) is used so links survive handle changes.
- Opening that link loads the map into the editor without signing in, via the worker's unauthenticated endpoint:

```
GET /public/map?did=<did>&rkey=<rkey>
  → 200 { name, doc: { dataBase64, symbolization, layer, folders, layerConfigs } }
  → 400 invalid did/rkey, 404 no such record, 502 DID unresolvable / PDS unreachable
```

The endpoint resolves the DID to its PDS (PLC directory / well-knowns / DoH — same resolver stack as the OAuth flow) and reuses `AtprotoRepo.getMap`, so shared loads and signed-in loads parse and validate records identically. Responses carry `Cache-Control: public, max-age=60` and the usual reflected-origin CORS headers.

Recipients who *are* signed in can keep a shared map via the ordinary "My maps → Save current map" flow, which writes a copy into their own repo.

## Deploy

Create the two KV namespaces (once) and fill their ids into `wrangler.toml`:

```
pnpm exec wrangler kv namespace create SESSION_KV
pnpm exec wrangler kv namespace create OAUTH_STATE_KV
```

Then:

```
pnpm install
pnpm exec wrangler deploy
pnpm exec wrangler secret put OAUTH_SIGNING_KEY
pnpm exec wrangler secret put COOKIE_SECRET
```

Generate the signing key once:

```
node --input-type=module -e "import { generateClientAssertionKey } from '@atcute/oauth-crypto'; console.log(JSON.stringify(await generateClientAssertionKey('main', 'ES256')))"
```

Point the frontend's `VITE_ATPROTO_PERSISTENCE_URL` at the deployed URL. The OAuth flow runs in a popup and reports back to whichever origin sent the `/oauth/login` request (via the `Origin` header, threaded through as OAuth state) — no separate return-URL configuration is needed.

## Branch previews (CI)

Every push to a non-`main` branch publishes a preview of this worker via
`.github/workflows/atproto-preview.yml`: `wrangler versions upload
--preview-alias <branch-slug>` creates a version with a stable URL that serves
that branch's code without touching production:

```
https://<branch-slug>-atproto-persistence.<account-subdomain>.workers.dev
```

The slug is derived from the branch name by `scripts/atproto-branch-slug.mjs`
(`feature/persist-v2` → `feature-persist-v2`, truncated to fit DNS label
limits), and the URL is written to the workflow run summary and exposed as the
job's `url` output.

One-time setup:

1. A production deployment must exist — `wrangler versions upload` fails on a
   worker that has never been deployed. The manual deploy above covers this.
2. Repo secrets: `CLOUDFLARE_API_TOKEN` (Workers Scripts: Edit, Workers KV
   Storage: Edit) and `CLOUDFLARE_ACCOUNT_ID`.

Pushes to `main` deploy production via `.github/workflows/atproto-deploy.yml`.

Notes:

- Version previews inherit the worker-level secrets (`OAUTH_SIGNING_KEY`,
  `COOKIE_SECRET`), so there is no per-branch secret setup.
- Preview versions bind the production KV namespaces. OAuth state and sessions
  are per-client (each preview URL is its own atproto OAuth client — metadata
  and redirect URIs are derived from the request host), so signing in on a
  preview is a fresh consent flow, but using the same account on a preview can
  displace that account's production session.
- Preview versions accumulate; prune them occasionally with
  `wrangler versions list` / `wrangler versions delete` or in the dashboard.

### Pairing branch builds of the app

Cloudflare Pages branch builds of the app point at the matching worker preview
automatically: set `WORKERS_DEV_SUBDOMAIN` (e.g. `example.workers.dev`) as a
**preview-only** environment variable on the Pages project. `vite.config.mts`
then computes `VITE_ATPROTO_PERSISTENCE_URL` at build time from the Pages
branch name using the same alias formula the workflow published. Production
and local builds never see those variables, so the feature stays tree-shaken
out of them.

## Local development with the real OAuth flow

Plain `wrangler dev` serves `http://localhost`, and atproto confidential-client OAuth requires an https `client_id` that the PDS can fetch over the public internet. A Cloudflare tunnel provides that URL; the worker honors `X-Forwarded-Proto`, so no code changes are needed.

Use a named tunnel, with both the app and the worker as hostnames under one domain you control.

One-time setup (needs a domain already on your Cloudflare account's DNS):

```
cloudflared tunnel login
cloudflared tunnel create placemark-dev
cloudflared tunnel route dns placemark-dev dev-app.yourdomain.com
cloudflared tunnel route dns placemark-dev dev-worker.yourdomain.com
```

Create `~/.cloudflared/config.yml` (path from the `tunnel create` output):

```yaml
tunnel: <tunnel-id-from-create-output>
credentials-file: /path/to/.cloudflared/<tunnel-id>.json

ingress:
  - hostname: dev-app.yourdomain.com
    service: http://localhost:5173
  - hostname: dev-worker.yourdomain.com
    service: http://localhost:8799
  - service: http_status:404
```

Each dev session, these three run together:

```
pnpm exec wrangler dev --port 8799
cloudflared tunnel run placemark-dev
VITE_ATPROTO_PERSISTENCE_URL=https://dev-worker.yourdomain.com pnpm dev
```

`pnpm dev:atproto` (root `package.json`) runs all three via
`scripts/dev-atproto-tunnel.mjs`, prefixing each process's output and
shutting all of them down together on Ctrl-C. It hardcodes this project's
tunnel hostnames, so it only works once the one-time tunnel setup above has
been done with this repo's real domain.

Open `https://dev-app.yourdomain.com`, not `localhost:5173`.

`wrangler dev` (without `--remote`) simulates both KV namespaces locally — no real namespace ids are needed for local dev, only for `wrangler deploy`.

`.dev.vars` (gitignored) needs:

- `OAUTH_SIGNING_KEY` — the JWK as **unquoted** JSON (wrangler's dotenv does not unescape quoted values)
- `COOKIE_SECRET` — any long random string

Verify the worker side without a browser (this part doesn't depend on the cookie, a quick tunnel is fine just for this):

```
cloudflared tunnel --url http://localhost:8799
curl https://<worker-tunnel>/oauth/client-metadata.json
curl -X POST https://<worker-tunnel>/oauth/login --data-urlencode "handle=your.handle.bsky.social"
```

The second command returning a 302 to `https://bsky.social/oauth/authorize?...` means handle resolution and PAR completed end to end.
