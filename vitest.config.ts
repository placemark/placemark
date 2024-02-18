import { loadEnvConfig } from "@next/env";
import { defineConfig } from "vitest/config";

import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

const projectDir = process.cwd();
loadEnvConfig(projectDir);

// https://vitejs.dev/config/
export default defineConfig({
  // @ts-expect-error todo
  plugins: [react(), tsconfigPaths()],
  test: {
    dir: "./",
    deps: {
      interopDefault: true,
    },
    globals: true,
    setupFiles: "./test/setup.ts",
    globalSetup: "./test/global_setup.ts",
    coverage: {
      reporter: ["text", "json", "html"],
    },
  },
});
