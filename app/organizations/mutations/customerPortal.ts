import { resolver } from "@blitzjs/rpc";
import stripe, { stripeEnabled } from "integrations/stripe";
import { env } from "app/lib/env_server";
import db from "db";

// https://stripe.com/docs/billing/subscriptions/checkout#customer-portal
export default resolver.pipe(
  resolver.authorize(["OWNER", "SUPERADMIN"]),
  async (_input, ctx) => {
    if (!stripeEnabled) {
      throw new Error("Stripe disabled");
    }

    const org = await db.organization.findFirstOrThrow({
      where: { id: ctx.session.orgId },
      select: { stripeCustomerId: true, id: true },
    });

    // This is the url to which the customer will be redirected when they are done
    // managing their billing with the portal.
    const portalsession = await stripe.billingPortal.sessions.create({
      customer: org.stripeCustomerId,
      return_url: env.DOMAIN + `/settings/organization`,
    });

    return {
      url: portalsession.url,
    };
  }
);
