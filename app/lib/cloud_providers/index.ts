import type { CloudProvider } from "./types";

// import.meta.glob + reading VITE_ATPROTO_PERSISTENCE_URL directly (not
// via env_client's wrapper, which defeats Rollup's dead-code elimination)
// lets Vite drop atproto/client.ts entirely from the build when unset.
// Verified via real pnpm build runs; see task-11-report.md.
const modules = import.meta.glob<{
  atprotoProvider: (baseUrl: string) => CloudProvider;
}>("./atproto/client.ts");

const providers: CloudProvider[] = [];
if (import.meta.env.VITE_ATPROTO_PERSISTENCE_URL) {
  const { atprotoProvider } = await modules["./atproto/client.ts"]();
  providers.push(atprotoProvider(import.meta.env.VITE_ATPROTO_PERSISTENCE_URL));
}

// Top-level await: consumers see a plain, already-resolved array.
export const CLOUD_PROVIDERS: CloudProvider[] = providers;
