/// <reference types="vite/client" />

interface ViteTypeOptions {
  strictImportMetaEnv: unknown;
}

interface ImportMetaEnv {
  readonly VITE_PUBLIC_GEOCODE_EARTH_TOKEN: string;
  readonly VITE_PUBLIC_OSRM_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
