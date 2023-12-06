import type { Organization } from "@prisma/client";
import { env } from "app/lib/env_client";
import Stripe from "stripe";

class COrganization {
  /**
   * Returns whether a given organization is
   * on an enterprise account.
   */
  isEnterprise(organization: Organization) {
    return organization.price === env.NEXT_PUBLIC_STRIPE_PRICE_ID_ENTERPRISE;
  }

  /**
   * Whether a fetched subscription is enterprise.
   */
  subscriptionIsEnterprise(subscription: Stripe.Subscription) {
    return (
      subscription.items.data[0].price.id ===
      env.NEXT_PUBLIC_STRIPE_PRICE_ID_ENTERPRISE
    );
  }
}

export const UOrganization = new COrganization();
