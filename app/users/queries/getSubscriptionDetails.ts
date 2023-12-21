import { resolver } from "@blitzjs/rpc";
import stripe, { stripeEnabled } from "integrations/stripe";
import { env } from "app/lib/env_server";

export default resolver.pipe(async ({}) => {
  if (!stripeEnabled) {
    return null;
  }

  const price = await stripe.prices.retrieve(env.STRIPE_PRICE_ID);

  return {
    price,
    trial: env.STRIPE_TRIAL_DAYS,
  };
});
