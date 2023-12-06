import Stripe from "stripe";
import { AuthorizationError } from "blitz";
import db from "db";
import { logger } from "integrations/log";
import { env } from "app/lib/env_server";
import { env as env_client } from "app/lib/env_client";
import { notifyTeam } from "./notify_team";

export * from "stripe";

// Centrally configure an instance of the Stripe client
const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2022-11-15",
});

export default stripe;

export async function createStripeCheckoutSession(
  customerId: string,
  promotionCode?: string | null
) {
  let discount = {};

  if (promotionCode) {
    const promotionCodes = await stripe.promotionCodes.list({
      code: promotionCode,
    });

    const code = promotionCodes.data[0];
    if (code) {
      discount = {
        discounts: [
          {
            promotion_code: promotionCodes.data[0].id,
          },
        ],
      };
    }
  }

  return await stripe.checkout.sessions.create({
    ...discount,
    customer: customerId,
    mode: "subscription",
    automatic_tax: {
      enabled: true,
    },
    line_items: [
      {
        price: env.STRIPE_PRICE_ID,
        quantity: 1,
      },
    ],
    subscription_data: {
      trial_period_days: env.STRIPE_TRIAL_DAYS,
    },
    customer_update: {
      address: "auto",
    },
    success_url: `${env.DOMAIN}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.DOMAIN}/cancelled?session_id={CHECKOUT_SESSION_ID}`,
  });
}

export async function updateQuantityForOrganization(organizationId: number) {
  const { name: organizationName, stripeCustomerId } =
    await db.organization.findFirstOrThrow({
      where: {
        id: organizationId,
      },
    });

  const quantity = await db.membership.count({
    where: {
      organizationId: organizationId,
      /**
       * Try to only query for people who have accepted
       * their invitations.
       */
      invitedName: null,
      membershipStatus: "ACTIVE",
    },
  });

  logger.info(`New quantity=${quantity}`);

  const customer = await stripe.customers.retrieve(stripeCustomerId, {
    expand: ["subscriptions"],
  });

  if (customer.deleted) {
    throw new AuthorizationError("Encountered a deleted customer");
  }

  if (customer.subscriptions!.data.length > 1) {
    throw new AuthorizationError(
      "Encountered multiple subscriptions for a single customer"
    );
  }

  if (customer.subscriptions!.data.length === 0) {
    throw new AuthorizationError(
      "This organization has no active subscription"
    );
  }

  const [subscription] = customer.subscriptions!.data;

  if (subscription.items.data.length !== 1) {
    throw new AuthorizationError(
      "Encountered multiple items for a subscription"
    );
  }

  const [item] = subscription.items.data;

  if (item.price.id === env_client.NEXT_PUBLIC_STRIPE_PRICE_ID_ENTERPRISE) {
    if (item.quantity && item.quantity < quantity) {
      await notifyTeam(
        `Enterprise plan exceeded its limit (${organizationName})`,
        `Their allocated quantity: ${item.quantity} vs the quantity that results from a change: ${quantity}.
          The team: ${organizationName}.`
      );
    }

    logger.info(
      `Did not update the price of a subscription because it is enterprise`
    );

    const res = await stripe.subscriptions.update(subscription.id, {
      items: [
        {
          id: item.id,
          metadata: {
            currentUsers: quantity,
          },
        },
      ],
    });

    logger.info(res);
    return;
  }

  logger.info(
    `Updating with subscription=${subscription.id} price=${item.price.id}`
  );

  const res = await stripe.subscriptions.update(subscription.id, {
    items: [
      {
        id: item.id,
        quantity,
      },
    ],
  });

  logger.info(res);
}
