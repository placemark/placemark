import { envsafe, str, num } from "envsafe";

export const env = envsafe({
  /**
   * Key for authenticating Mapbox maps.
   */
  NEXT_PUBLIC_MAPBOX_TOKEN: str({
    input: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
    devDefault: "_",
  }),
  /**
   * We use geocode.earth for geocoding:
   * https://geocode.earth/
   *
   * This is the token to authenticate with them.
   */
  NEXT_PUBLIC_GEOCODE_EARTH_TOKEN: str({
    input: process.env.NEXT_PUBLIC_GEOCODE_EARTH_TOKEN,
    devDefault: "_",
  }),
  /**
   * There's a separate host for websockets:
   * this points to it.
   */
  NEXT_PUBLIC_WS_HOST: str({
    input: process.env.NEXT_PUBLIC_WS_HOST,
    devDefault: "ws.placemark.io",
  }),
  /**
   * Limit for files at the frontend side.
   */
  NEXT_PUBLIC_FILE_LIMIT_MB: num({
    input: process.env.NEXT_PUBLIC_FILE_LIMIT_MB,
  }),
  /**
   * Warn people with files at least this big.
   */
  NEXT_PUBLIC_FILE_WARN_MB: num({
    input: process.env.NEXT_PUBLIC_FILE_WARN_MB,
  }),
  /**
   * Domain of the site when deployed.
   */
  NEXT_PUBLIC_DOMAIN_WITH_SLASH: str({
    input: process.env.NEXT_PUBLIC_DOMAIN_WITH_SLASH,
    devDefault: "http://localhost:3000/",
  }),
  /**
   * Domain of the API when deployed
   */
  NEXT_PUBLIC_API_BASE_WITH_SLASH: str({
    input: process.env.NEXT_PUBLIC_API_BASE_WITH_SLASH,
    devDefault: "http://localhost:3000/",
  }),
  /**
   * Key for authenticating with Replicache
   * https://replicache.dev/
   */
  NEXT_PUBLIC_REPLICACHE_KEY: str({
    input: process.env.NEXT_PUBLIC_REPLICACHE_KEY,
    devDefault: "_",
  }),
});
