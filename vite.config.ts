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
    allowedHosts: ['tunnel-web.placemark.io']
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
