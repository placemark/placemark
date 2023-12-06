import { SecurePassword } from "@blitzjs/auth/secure-password";
import { resolver } from "@blitzjs/rpc";
import db from "db";
import stripe from "integrations/stripe";
import { Signup } from "app/auth/validations";
import { createSession } from "app/core/utils";
import { campaignMonitorSubscribe } from "integrations/campaignmonitor";
import { capture, identifyOrganization } from "integrations/posthog";
import { env } from "app/lib/env_server";
import { AuthorizationError } from "blitz";

export const INSERTED_USER_SELECT = {
  id: true,
  memberships: {
    select: {
      id: true,
      role: true,
      organization: true,
    },
  },
  name: true,
  email: true,
  role: true,
  darkMode: true,
  coordinateOrder: true,
  onboardDocumentationHighlights: true,
  lengthUnits: true,
  areaUnits: true,
  workOsId: true,
} as const;

/**
 * Signing up, stage one. We:
 *
 * - Create a Customer in Stripe
 * - Create a user in the database
 * - Log that user in
 * - Create a checkout session for that user
 * - Return the id of that checkout session so that
 *   the UI can redirect.
 */
export default resolver.pipe(
  resolver.zod(Signup),
  async (
    { email: rawEmail, name, organizationName, password, subscribe },
    ctx
  ) => {
    throw new AuthorizationError("Signing up is disabled");
    const hashedPassword = await SecurePassword.hash(password.trim());
    const email = rawEmail.toLowerCase().trim();

    const customer = await stripe.customers.create({
      name,
      email,
      description: organizationName,
    });

    await stripe.subscriptions.create({
      customer: customer.id,
      items: [
        {
          price: env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      trial_period_days: env.STRIPE_TRIAL_DAYS,
    });

    const user = await db.user.create({
      data: {
        email,
        name,
        hashedPassword,
        role: "CUSTOMER",
        memberships: {
          create: {
            role: "OWNER",
            organization: {
              create: {
                name: organizationName.trim() || "My team",
                stripeCustomerId: customer.id,
                price: env.STRIPE_PRICE_ID,
              },
            },
          },
        },
      },
      select: INSERTED_USER_SELECT,
    });

    if (subscribe && process.env.NODE_ENV === "production") {
      await campaignMonitorSubscribe(email, name);
    }

    await createSession(user, ctx);

    capture(ctx, {
      event: "signup",
    });

    identifyOrganization(user.memberships[0].organization);

    return;
  }
);
