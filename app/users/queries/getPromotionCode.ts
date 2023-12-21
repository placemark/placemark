import { resolver } from "@blitzjs/rpc";
import stripe, { stripeEnabled } from "integrations/stripe";

import { z } from "zod";

const GetPromotionCode = z.object({
  code: z.string(),
});

export default resolver.pipe(
  resolver.zod(GetPromotionCode),
  async ({ code }) => {
    if (!stripeEnabled) return null;

    const result = await stripe.promotionCodes.list({
      code,
    });

    if (result.data.length !== 1) {
      return null;
    }

    return result.data[0];
  }
);
