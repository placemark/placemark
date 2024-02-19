import { env } from "app/lib/env_server";
import { Octokit } from "@octokit/core";

/**
 * Octokit configured to act as Placemark staff.
 * For filing issues.
 */
export const client = new Octokit({
  auth: env.GITHUB_ISSUES_TOKEN,
});
