import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { configDefaults, defineConfig } from "vitest/config";
import { branchSlug } from "./scripts/atproto-branch-slug.mjs";

const localRoots = ["app", "types", "state", "integrations", "test", "vendor", "styles", "shared"];

// On Cloudflare Pages branch (preview) builds, point the frontend at this
// branch's atproto-persistence worker preview. The preview is uploaded by
// .github/workflows/atproto-preview.yml under the same branch-derived alias,
// so the two URLs always match. WORKERS_DEV_SUBDOMAIN is set as a
// preview-only env var on the Pages project, so production and local builds
// see neither variable and the feature stays tree-shaken out.
function atprotoPreviewUrl(): string | undefined {
  const branch = process.env.CF_PAGES_BRANCH;
  const subdomain = process.env.WORKERS_DEV_SUBDOMAIN;
  if (!branch || branch === "main" || !subdomain) return undefined;
  return `https://${branchSlug(branch)}-atproto-persistence.${subdomain}`;
}

const atprotoPreview = atprotoPreviewUrl();

// Without this, the atproto OAuth popup's browsing context gets severed
// from ours (window.opener/popup.closed stop reporting anything useful)
// the moment it navigates to the identity provider's own page, since
// those typically set their own strict Cross-Origin-Opener-Policy. This
// is the opt-in the spec provides for a page that opens cross-origin
// popups and still wants to keep talking to them. See also public/_headers,
// which applies the same header to the production (Cloudflare Pages) build.
const COOP_HEADERS = {
  "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
};

// https://vitejs.dev/config/
export default defineConfig((env) => ({
  ...(atprotoPreview
    ? {
        define: {
          "import.meta.env.VITE_ATPROTO_PERSISTENCE_URL": JSON.stringify(atprotoPreview),
        },
      }
    : {}),
  server: {
    allowedHosts: ['tunnel-web.placemark.io'],
    headers: COOP_HEADERS,
  },
  preview: {
    headers: COOP_HEADERS,
  },
  resolve: {
    alias: localRoots.map((dir) => ({
      find: dir,
      replacement: resolve(import.meta.dirname, dir),
    })),
  },
  optimizeDeps: {
    exclude: ["maplibre-gl"],
  },
  plugins:
    env.mode === "test"
      ? [react()]
      : [react(), nodePolyfills()],
  worker: {
    format: "es",
    plugins: () => [],
  },
  test: {
    dir: "./",
    // The atproto-persistence worker is a standalone package with its own
    // lockfile and dependencies, so this suite's install doesn't cover
    // its imports. Its tests run in their own CI step via
    // `pnpm --dir workers/atproto-persistence test`.
    exclude: [...configDefaults.exclude, "workers/**", ".claude/worktrees/**"],
    deps: {
      interopDefault: true,
    },
    globals: true,
    setupFiles: "./test/setup.ts",
    coverage: {
      reporter: ["text", "json", "html"],
    },
  },
}));
