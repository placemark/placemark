import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { defineConfig } from "vitest/config";

const localRoots = ["app", "types", "state", "integrations", "test", "vendor", 'styles'];

// https://vitejs.dev/config/
export default defineConfig((env) => ({
  resolve: {
    alias: localRoots.map((dir) => ({
      find: dir,
      replacement: resolve(import.meta.dirname, dir),
    })),
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
