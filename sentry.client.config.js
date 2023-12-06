/* eslint-env node */
// This file configures the initialization of Sentry on the browser.
// The config you add here will be used whenever a page is visited.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

const dsn =
  SENTRY_DSN ||
  "https://8529828a4a8e4e0aa939318cc8955b30@o881088.ingest.sentry.io/5835358";

Sentry.init({
  dsn,
});
