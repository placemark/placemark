import { resolver } from "@blitzjs/rpc";
import db from "db";
import { capture, identifyOrganization } from "integrations/posthog";
import stripe, { createStripeCheckoutSession } from "integrations/stripe";
import { CreateOrganization } from "../validations";

export default resolver.pipe(
  resolver.zod(CreateOrganization),
  resolver.authorize(),
  async ({ name }, ctx) => {
    const user = await db.user.findFirstOrThrow({
      where: { id: ctx.session.userId },
    });

    const customer = await stripe.customers.create({
      email: user.email,
    });

    const organization = await db.organization.create({
      data: {
        name,
        stripeCustomerId: customer.id,
        membership: {
          create: {
            role: "OWNER",
            userId: user.id,
          },
        },
      },
      include: {
        membership: true,
      },
    });

    const stripeSession = await createStripeCheckoutSession(customer.id);

    await ctx.session.$setPublicData({
      orgId: organization.id,
      roles: [user.role, "OWNER"],
    });

    capture(ctx, {
      event: "organization-create",
    });

    identifyOrganization(organization);

    return stripeSession.id;
  }
);
