import { env } from "app/lib/env_server";
import * as Sentry from "@sentry/nextjs";

/**
 * The list ID for 'Placemark updates'
 *
 * https://placemark.createsend.com/audience/2DBCECEDF625217D/lists/13501B63095BB913
 */
const LIST_ID = "fdc081ecfd6780a7cc0acf586b8defd8";
const headers = {
  Authorization: `Basic ${Buffer.from(env.CAMPAIGNMONITOR_KEY).toString(
    "base64"
  )}`,
} as const;

/**
 * Base for the Campaign Monitor API
 *
 * https://www.campaignmonitor.com/api/v3-3/lists/
 */
export const API_BASE_WITH_SLASH = "https://api.createsend.com/api/v3.3/";

/**
 * Subscribe a user to the updates list. This happens
 * automatically on signup.
 *
 * - [x] Optional
 */
export async function campaignMonitorSubscribe(email: string, name: string) {
  if (!env.CAMPAIGNMONITOR_KEY) return null;

  try {
    await fetch(`${API_BASE_WITH_SLASH}subscribers/${LIST_ID}.json`, {
      method: "POST",
      body: JSON.stringify({
        EmailAddress: email,
        Name: name,
        CustomFields: [],
        Resubscribe: true,
        RestartSubscriptionBasedAutoresponders: true,
        ConsentToTrack: "Yes",
      }),
      headers,
    });
  } catch (e) {
    Sentry.captureException(e);
  }
}

/**
 * Remove a user from the mailing list.
 * When people delete their accounts, we automatically unsubscribe
 * them.
 */
export async function campaignMonitorUnubscribe(email: string) {
  try {
    await fetch(
      `${API_BASE_WITH_SLASH}subscribers/${LIST_ID}/unsubscribe.json`,
      {
        method: "POST",
        body: JSON.stringify({
          EmailAddress: email,
        }),
        headers,
      }
    );
  } catch (e) {
    Sentry.captureException(e);
  }
}
