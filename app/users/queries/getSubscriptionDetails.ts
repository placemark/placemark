import { resolver } from "@blitzjs/rpc";
import stripe from "integrations/stripe";
import { env } from "app/lib/env_server";

export default resolver.pipe(async ({}) => {
  const price = await stripe.prices.retrieve(env.STRIPE_PRICE_ID);

  return {
    price,
    trial: env.STRIPE_TRIAL_DAYS,
  };
});
