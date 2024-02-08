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
  POSTMARK_SERVER_API_TOKEN: str({ devDefault: "test", default: "off" }),
  /**
   * This is the stripe webhook secret, required to verify
   * webhooks. You'll find it in your Stripe dashboard.
   */
  /**
   * This is for sending logs to Logtail. Use logtail and copy
   * the API token.
   */
  LOGTAIL_TOKEN: str({
    default: "off",
  }),
  /**
   * For image uploads, this is the account id.
   */
  CLOUDFLARE_IMAGES_ACCOUNT_ID: str({ default: "off" }),
  /**
   * Same, for uploading images.
   */
  CLOUDFLARE_API_TOKEN: str({ default: "off" }),
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
  WORKOS_API_KEY: str({ default: "off" }),
  WORKOS_CLIENT_ID: str({ default: "off" }),
  WORKOS_REDIRECT_URL: str({ default: "off" }),
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

if (env.WORKOS_API_KEY === "off") {
  // eslint-disable-next-line
  console.log("Disabling WorkOS integration");
}

if (env.LOGTAIL_TOKEN === "off") {
  // eslint-disable-next-line
  console.log("Disabling Logtail integration");
}

if (env.CLOUDFLARE_API_TOKEN === "off") {
  // eslint-disable-next-line
  console.log("Disabling Cloudflare integration");
}

if (env.POSTMARK_SERVER_API_TOKEN === "off") {
  // eslint-disable-next-line
  console.log("Disabling Postmark integration");
}
