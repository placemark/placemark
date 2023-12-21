import { envsafe, str, num, bool } from "envsafe";

export const env = envsafe({
  /**
   * Accessible from your Stripe dashboard.
   */
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: str({
    input: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    default: "off",
  }),
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
  /**
   * Price ID for enterprise accounts. Found in your
   * Stripe dashboard.
   */
  NEXT_PUBLIC_STRIPE_PRICE_ID_ENTERPRISE: str({
    input: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_ENTERPRISE,
    default: "off",
  }),
  /**
   * Using Posthog for product analytics
   * https://posthog.com/
   *
   * This is from their dashboard.
   */
  NEXT_PUBLIC_POSTHOG_API_TOKEN: str({
    input: process.env.NEXT_PUBLIC_POSTHOG_API_TOKEN,
    default: "off",
  }),
  NEXT_PUBLIC_POSTHOG_API_HOST: str({
    input: process.env.NEXT_PUBLIC_POSTHOG_API_HOST,
    default: "off",
  }),
  /**
   * I think this is unused: feel free to confirm
   * and submit a PR.
   */
  NEXT_PUBLIC_SKIP_PAYMENT: bool({
    input: process.env.NEXT_PUBLIC_SKIP_PAYMENT,
    devDefault: false,
    default: false,
  }),
});
