import { envsafe, str, num, bool } from "envsafe";

export const env = envsafe({
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: str({
    input: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    devDefault: "_",
  }),
  NEXT_PUBLIC_MAPBOX_TOKEN: str({
    input: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
    devDefault: "_",
  }),
  NEXT_PUBLIC_GEOCODE_EARTH_TOKEN: str({
    input: process.env.NEXT_PUBLIC_GEOCODE_EARTH_TOKEN,
    devDefault: "_",
  }),
  NEXT_PUBLIC_WS_HOST: str({
    input: process.env.NEXT_PUBLIC_WS_HOST,
    devDefault: "ws.placemark.io",
  }),
  NEXT_PUBLIC_FILE_LIMIT_MB: num({
    input: process.env.NEXT_PUBLIC_FILE_LIMIT_MB,
  }),
  NEXT_PUBLIC_FILE_WARN_MB: num({
    input: process.env.NEXT_PUBLIC_FILE_WARN_MB,
  }),
  NEXT_PUBLIC_DOMAIN_WITH_SLASH: str({
    input: process.env.NEXT_PUBLIC_DOMAIN_WITH_SLASH,
    devDefault: "http://localhost:3000/",
  }),
  NEXT_PUBLIC_API_BASE_WITH_SLASH: str({
    input: process.env.NEXT_PUBLIC_API_BASE_WITH_SLASH,
    devDefault: "http://localhost:3000/",
  }),
  NEXT_PUBLIC_REPLICACHE_KEY: str({
    input: process.env.NEXT_PUBLIC_REPLICACHE_KEY,
    devDefault: "_",
  }),
  NEXT_PUBLIC_STRIPE_PRICE_ID_ENTERPRISE: str({
    input: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_ENTERPRISE,
  }),
  NEXT_PUBLIC_POSTHOG_API_TOKEN: str({
    input: process.env.NEXT_PUBLIC_POSTHOG_API_TOKEN,
  }),
  NEXT_PUBLIC_POSTHOG_API_HOST: str({
    input: process.env.NEXT_PUBLIC_POSTHOG_API_HOST,
  }),
  NEXT_PUBLIC_SKIP_PAYMENT: bool({
    input: process.env.NEXT_PUBLIC_SKIP_PAYMENT,
    devDefault: false,
    default: false,
  }),
});
