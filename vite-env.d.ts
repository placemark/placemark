/// <reference types="vite/client" />

interface ViteTypeOptions {
  strictImportMetaEnv: unknown;
}

interface ImportMetaEnv {
  readonly VITE_PUBLIC_MAPBOX_TOKEN: string;
  readonly VITE_PUBLIC_GEOCODE_EARTH_TOKEN: string;
  readonly VITE_PUBLIC_DROPBOX_APP_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
