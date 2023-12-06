import { envsafe, str, num } from "envsafe";

export const env = envsafe({
  DOMAIN: str(),
  DATABASE_URL: str(),
  POSTMARK_SERVER_API_TOKEN: str({ devDefault: "test" }),
  STRIPE_WEBHOOK_SECRET: str({
    devDefault: "_",
  }),
  STRIPE_SECRET_KEY: str(),
  STRIPE_PRICE_ID: str(),
  STRIPE_TRIAL_DAYS: num(),
  LOGTAIL_TOKEN: str(),
  CLOUDFLARE_IMAGES_ACCOUNT_ID: str(),
  CLOUDFLARE_API_TOKEN: str(),
  BLOG_RSS_URL: str(),
  WFC_QUOTA: num(),
  WFC_QUOTA_ENTERPRISE: num(),
  WORKOS_API_KEY: str(),
  WORKOS_CLIENT_ID: str(),
  WORKOS_REDIRECT_URL: str(),
  CAMPAIGNMONITOR_KEY: str(),
  TEAM_EMAIL: str(),
  GITHUB_CLIENT_ID: str(),
  GITHUB_CLIENT_SECRET: str(),
  GITHUB_ISSUES_TOKEN: str({
    devDefault: "_",
  }),
});
