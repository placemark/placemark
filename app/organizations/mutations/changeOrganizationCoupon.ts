import { resolver } from "@blitzjs/rpc";
import { NotFoundError } from "blitz";
import db from "db";
import { capture } from "integrations/posthog";
import * as Sentry from "@sentry/nextjs";
import stripe from "integrations/stripe";
import { ChangeCoupon } from "../validations";

export default resolver.pipe(
  resolver.zod(ChangeCoupon),
  resolver.authorize("OWNER"),
  async ({ code }, ctx) => {
    const membership = await db.membership.findFirstOrThrow({
      where: { organizationId: ctx.session.orgId, userId: ctx.session.userId },
      include: {
        organization: true,
      },
    });

    try {
      const subscription = (
        await stripe.subscriptions.list({
          customer: membership.organization.stripeCustomerId,
        })
      ).data[0];

      if (!subscription) {
        throw new Error("Subscription not found");
      }

      if (code) {
        const promotionCode = await stripe.promotionCodes.list({
          code,
          limit: 1,
        });

        const id = promotionCode?.data?.[0]?.id;

        if (!id) {
          throw new NotFoundError("Promotion code not found");
        }

        await stripe.subscriptions.update(subscription.id, {
          promotion_code: id,
        });
      } else {
        try {
          await stripe.subscriptions.deleteDiscount(subscription.id);
        } catch (e) {
          if ((e as Error).message?.match?.(/No active discount/)) {
            return;
          }
          throw e;
        }
      }
    } catch (e) {
      // console.log(e);
      if (!(e instanceof NotFoundError)) {
        Sentry.captureException(e);
        throw new Error("Unexpected error");
      } else {
        throw new NotFoundError("Could not apply coupon");
      }
    }

    capture(ctx, {
      event: "organization-coupon-apply",
    });

    return true;
  }
);
