import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { configDefaults, defineConfig } from "vitest/config";

const localRoots = ["app", "types", "state", "integrations", "test", "vendor", "styles", "shared"];

// https://vitejs.dev/config/
export default defineConfig((env) => ({
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
    exclude: [...configDefaults.exclude, "workers/**"],
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
