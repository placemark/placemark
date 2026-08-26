/// <reference types="vite/client" />

interface ViteTypeOptions {
  strictImportMetaEnv: unknown;
}

interface ImportMetaEnv {
  readonly VITE_PUBLIC_GEOCODE_EARTH_TOKEN: string;
  readonly VITE_PUBLIC_ROUTING_PROVIDER?: string;
  readonly VITE_PUBLIC_ROUTING_API_KEY?: string;
  readonly VITE_PUBLIC_ROUTING_URL?: string;
  readonly VITE_PUBLIC_OSRM_DRIVING_URL?: string;
  readonly VITE_PUBLIC_OSRM_WALKING_URL?: string;
  readonly VITE_PUBLIC_OSRM_CYCLING_URL?: string;
  readonly VITE_PUBLIC_MAPTILER_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
