import { resolver } from "@blitzjs/rpc";
import stripe, {
  createStripeCheckoutSession,
  stripeEnabled,
} from "integrations/stripe";
import db from "db";

export default resolver.pipe(resolver.authorize(), async (_input, ctx) => {
  const org = await db.organization.findUniqueOrThrow({
    where: {
      id: ctx.session.orgId,
    },
  });

  if (stripeEnabled) {
    let stripeCustomerId = org.stripeCustomerId;

    const customer = await stripe.customers.retrieve(stripeCustomerId);

    if (customer.deleted) {
      const previous_customer_id = stripeCustomerId;
      const user = await db.user.findUniqueOrThrow({
        where: {
          id: ctx.session.userId,
        },
      });
      const customer = await stripe.customers.create({
        name: user.name || "",
        email: user.email,
        description: org.name,
        metadata: {
          previous_customer_id,
        },
      });
      stripeCustomerId = customer.id;
      await db.organization.update({
        data: {
          stripeCustomerId: stripeCustomerId,
        },
        where: {
          id: ctx.session.orgId,
        },
      });
    }

    const stripeSession = await createStripeCheckoutSession(stripeCustomerId);

    return stripeSession.id;
  }

  return "";
});
