/// <reference types="stripe-event-types" />
import getRawBody from "raw-body";
import db, { SubscriptionStatus, MembershipRole } from "db";
import type { Stripe } from "integrations/stripe";
import stripe from "integrations/stripe";
import { env } from "app/lib/env_server";
import { logger } from "integrations/log";
import { trialEndingMailer } from "mailers/trialEndingMailer";
import { api } from "app/blitz-server";
import { posthog } from "integrations/posthog";
import * as Sentry from "@sentry/nextjs";

async function setDefaultPaymentMethod(session: Stripe.Checkout.Session) {
  const { customer, setup_intent } = session;

  if (!(setup_intent && customer)) return;

  const setupIntent = await stripe.setupIntents.retrieve(
    setup_intent as string
  );

  const { payment_method } = setupIntent;
  if (!payment_method) {
    logger.info("Got a checkout session, but no payment method");
    return;
  }

  await stripe.customers.update(customer as string, {
    invoice_settings: {
      default_payment_method: payment_method as string,
    },
  });
}

export async function handleTrialWillEnd(subscription: Stripe.Subscription) {
  const organization = await db.organization.findUnique({
    where: { stripeCustomerId: subscription.customer as string },
  });

  if (!organization) {
    logger.warn("A trial is ending but there is no matching organization", {
      stripeCustomerId: subscription.customer as string,
    });
    return;
  }

  const admins = await db.membership.findMany({
    where: {
      organizationId: organization.id,
      OR: [
        {
          role: MembershipRole.ADMIN,
        },
        {
          role: MembershipRole.OWNER,
        },
      ],
    },
    include: {
      user: true,
    },
  });

  const emails = admins.flatMap((membership) =>
    membership.user ? [membership.user.email] : []
  );

  if (!emails.length) {
    logger.error("Found nobody to email about a trial ending");
    return;
  }

  await trialEndingMailer({ to: emails }).send();
}

async function posthogCapture(
  event: Stripe.DiscriminatedEvent,
  customer: string,
  properties: Record<string | number, any> = {}
) {
  const org = await db.organization.findFirst({
    select: { id: true },
    where: { stripeCustomerId: customer },
  });

  if (!org) return;

  const user = await db.user.findFirst({
    select: { id: true },
    where: {
      memberships: {
        some: {
          organizationId: org.id,
          role: {
            in: ["ADMIN", "OWNER"],
          },
        },
      },
    },
  });

  if (!user) return;

  posthog?.capture({
    distinctId: String(user.id),
    event: `webhook/${event.type}`,
    groups: {
      organization: String(org.id),
    },
    properties,
  });
}

/**
 * https://stripe.com/docs/billing/subscriptions/checkout#customer-portal
 *
 * Because of weak types in Stripe: https://github.com/stripe/stripe-node/issues/758
 *
 * This is using https://github.com/kgajera/stripe-event-types to cut
 * down on casting.
 */
export default api(async function webhook(req, res) {
  if (req.method !== "POST") {
    res.status(400).end("POST method only");
    return;
  }

  const rawBody = await getRawBody(req, { limit: "2mb" });

  const signature = req.headers["stripe-signature"];
  let event: Stripe.DiscriminatedEvent;

  try {
    if (typeof signature !== "string") {
      throw new Error("stripe-signature header missing or incorrect");
    }
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    ) as Stripe.DiscriminatedEvent;
  } catch (err) {
    // console.log(`⚠️  Webhook signature verification failed.`, err);
    res.status(400).end();
    return;
  }

  logger.info("processing stripe webhook", { type: event.type });

  // Adopted from https://bit.ly/3mLMvnK
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      await setDefaultPaymentMethod(session);
      if (typeof session.subscription !== "string") {
        throw new Error(
          "Unexpectedly got a non-string subscription in a checkout webhook"
        );
        return;
      }
      const subscription = await stripe.subscriptions.retrieve(
        session.subscription
      );
      const price = subscription.items.data[0].price.id;
      await db.organization.update({
        where: { stripeCustomerId: session.customer as string },
        data: {
          subscriptionStatus: SubscriptionStatus.active,
          price,
        },
      });
      break;
    }

    case "customer.updated": {
      await posthogCapture(event, event.data.object.id);
      break;
    }

    case "invoice.paid": {
      await posthogCapture(event, event.data.object.customer as string, {
        amount_paid: event.data.object.amount_paid,
      });
      break;
    }

    case "customer.subscription.deleted": {
      await posthogCapture(event, event.data.object.customer as string, {
        status: event.data.object.status,
      });

      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object;

      try {
        await db.organization.update({
          where: { stripeCustomerId: subscription.customer as string },
          data: {
            subscriptionStatus: subscription.status,
            price: subscription.items.data[0].price.id,
          },
        });
      } catch (e) {
        Sentry.captureException(e);
      }

      await posthogCapture(event, event.data.object.customer as string, {
        status: event.data.object.status,
      });

      break;
    }

    case "customer.subscription.trial_will_end": {
      const subscription = event.data.object;
      await handleTrialWillEnd(subscription);
      break;
    }

    default:
  }

  res.status(200).end();
});

// This API route needs the raw body, not something parsed.
export const config = {
  api: {
    externalResolver: true,
    bodyParser: false,
  },
};
