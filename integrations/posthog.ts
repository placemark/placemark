import { PostHog } from "posthog-node";
import { env } from "app/lib/env_client";
import { Ctx } from "blitz";
import { Organization } from "db";

export const posthog =
  env.NEXT_PUBLIC_POSTHOG_API_TOKEN === "off"
    ? null
    : new PostHog(env.NEXT_PUBLIC_POSTHOG_API_TOKEN, {
        host: "https://app.posthog.com",
      });

type CaptureArgs = Omit<
  Parameters<PostHog["capture"]>[0],
  "distinctId" | "groups"
>;

export function capture(ctx: Ctx, args: CaptureArgs) {
  if (!posthog) return;
  return posthog.capture({
    distinctId: String(ctx.session.userId),
    groups:
      ctx.session.orgId !== undefined
        ? {
            organization: String(ctx.session.orgId),
          }
        : undefined,
    ...args,
  });
}

export function identifyOrganization(organization: Organization) {
  if (!posthog) return;
  posthog.groupIdentify({
    groupType: "organization",
    groupKey: String(organization.id),
    properties: {
      name: organization.name,
    },
  });
}
