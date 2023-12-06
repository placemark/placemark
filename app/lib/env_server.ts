import { envsafe, str, num } from "envsafe";

export const env = envsafe({
  DOMAIN: str(),
  /**
   * The full url of the postgres database.
   *
   * Will likely look like postgresql://host/database
   */
  DATABASE_URL: str(),
  /**
   * This uses Postmark
   * https://postmarkapp.com/
   * To send emails. This is the required token.
   */
  POSTMARK_SERVER_API_TOKEN: str({ devDefault: "test" }),
  /**
   * This is the stripe webhook secret, required to verify
   * webhooks. You'll find it in your Stripe dashboard.
   */
  STRIPE_WEBHOOK_SECRET: str({
    devDefault: "_",
  }),
  /** Same here: in your dashboard */
  STRIPE_SECRET_KEY: str(),
  /**
   * This is the ID of the price of a subscription. Create
   * a subscription with a price and copy this from your dashboard.
   */
  STRIPE_PRICE_ID: str(),
  /**
   * This might not really be necessary but we have it nonetheless.
   */
  STRIPE_TRIAL_DAYS: num(),
  /**
   * This is for sending logs to Logtail. Use logtail and copy
   * the API token.
   */
  LOGTAIL_TOKEN: str(),
  /**
   * For image uploads, this is the account id.
   */
  CLOUDFLARE_IMAGES_ACCOUNT_ID: str(),
  /**
   * Same, for uploading images.
   */
  CLOUDFLARE_API_TOKEN: str(),
  /**
   * This is for showing blog posts from the val town blog.
   * Probably can be removed in the OSS version:
   * PRs gladly accepted!
   */
  BLOG_RSS_URL: str(),
  /**
   * How many maps are allowed for standard accounts.
   */
  WFC_QUOTA: num(),
  /** How many are allowed for enterprise accounts */
  WFC_QUOTA_ENTERPRISE: num(),
  /**
   * WorkOS details, for SAML. Find these in the WorkOS
   * dashboard. This could potentially be removed from
   * this OSS version: PRs gladly accepted!
   */
  WORKOS_API_KEY: str(),
  WORKOS_CLIENT_ID: str(),
  WORKOS_REDIRECT_URL: str(),
  /**
   * For signing people up to newsletters when they sign
   * up.
   */
  CAMPAIGNMONITOR_KEY: str(),
  /**
   * This is the email address where feedback emails go to.
   */
  TEAM_EMAIL: str(),
  /**
   * GitHub details: needed for saving maps to Gists.
   */
  GITHUB_CLIENT_ID: str(),
  GITHUB_CLIENT_SECRET: str(),
  GITHUB_ISSUES_TOKEN: str({
    devDefault: "_",
  }),
});
