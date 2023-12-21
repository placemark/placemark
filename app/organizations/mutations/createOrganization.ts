import { resolver } from "@blitzjs/rpc";
import db from "db";
import { capture, identifyOrganization } from "integrations/posthog";
import stripe, {
  stripeEnabled,
  createStripeCheckoutSession,
} from "integrations/stripe";
import { CreateOrganization } from "../validations";

export default resolver.pipe(
  resolver.zod(CreateOrganization),
  resolver.authorize(),
  async ({ name }, ctx) => {
    const user = await db.user.findFirstOrThrow({
      where: { id: ctx.session.userId },
    });

    const customer = stripeEnabled
      ? await stripe.customers.create({
          email: user.email,
        })
      : { id: "" };

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

    const stripeSession = stripeEnabled
      ? await createStripeCheckoutSession(customer.id)
      : { id: "" };

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
