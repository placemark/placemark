import { resolver } from "@blitzjs/rpc";
import db from "db";
import { capture, identifyOrganization } from "integrations/posthog";
import * as Sentry from "@sentry/nextjs";
import stripe, { stripeEnabled } from "integrations/stripe";
import { Name } from "../validations";

export default resolver.pipe(
  resolver.zod(Name),
  resolver.authorize(["OWNER"]),
  async ({ id, name }, ctx) => {
    const membership = await db.membership.findFirstOrThrow({
      where: { organizationId: id, userId: ctx.session.userId },
      include: {
        organization: true,
      },
    });

    const organization = await db.organization.update({
      where: { id },
      data: { name },
    });

    if (stripeEnabled) {
      await stripe.customers
        .update(membership.organization.stripeCustomerId, {
          name,
        })
        .catch((e) => {
          // Allow this operation to fail, this is not
          // essential
          Sentry.captureException(e);
        });
    }

    capture(ctx, {
      event: "organization-rename",
    });

    identifyOrganization(organization);

    return true;
  }
);
