import { useMutation, useQuery } from "@blitzjs/rpc";
import { useAuthenticatedSession } from "@blitzjs/auth";
import { simpleRolesIsAuthorized } from "app/auth/utils";
import type Stripe from "stripe";
import {
  Button,
  CapsLabel,
  styledInlineA,
  TextWell,
} from "app/components/elements";
import customerPortal from "app/organizations/mutations/customerPortal";
import checkoutAgain from "app/auth/mutations/checkoutAgain";
import getOrganization from "app/organizations/queries/getOrganization";
import { formatUSD, pluralize } from "app/lib/utils";
import { loadStripe } from "@stripe/stripe-js";
import { env } from "app/lib/env_client";
import React from "react";
import { SUPPORT_EMAIL } from "app/lib/constants";
import { UOrganization } from "app/lib/uorganization";

const statusLabels: Record<Stripe.Subscription["status"], string> = {
  trialing: "Free trial",
  active: "Active",
  canceled: "Cancelled",
  unpaid: "Unpaid",
  incomplete: "Incomplete",
  past_due: "Past due",
  incomplete_expired: "Expired",
};

function RestartBilling() {
  const [checkoutAgainMutation] = useMutation(checkoutAgain);
  return (
    <Button
      onClick={async () => {
        const sessionId = await checkoutAgainMutation({});
        const stripe = await loadStripe(env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
        if (!stripe) throw new Error("Could not load Stripe");
        await stripe.redirectToCheckout({
          sessionId,
        });
      }}
    >
      Restart
    </Button>
  );
}

function ManageBilling() {
  const [customerPortalMutation] = useMutation(customerPortal);
  return (
    <Button
      onClick={async () => {
        const { url } = await customerPortalMutation({});
        window.location.href = url;
      }}
    >
      Manage billing
    </Button>
  );
}

export function AddPaymentMethod() {
  const [customerPortalMutation] = useMutation(customerPortal);
  const [{ customer }] = useQuery(getOrganization, null);

  const subscription = !customer?.deleted && customer?.subscriptions?.data[0];

  const openCustomerPortal = async () => {
    const { url } = await customerPortalMutation({});
    window.location.href = url;
  };

  if (subscription && subscription?.cancel_at) {
    return (
      <div>
        <TextWell>
          You’ve cancelled this subscription, and it’ll expire at the end of the
          billing cycle. You can renew if you change your mind.
        </TextWell>
        <div className="pt-2">
          <Button onClick={openCustomerPortal}>Renew account</Button>
        </div>
      </div>
    );
  }

  return null;
}

function SubscriptionSummary({
  customer,
}: {
  customer: Stripe.Customer | Stripe.DeletedCustomer | undefined;
}) {
  const subscription = !customer?.deleted && customer?.subscriptions?.data[0];
  if (!subscription) {
    return (
      <TextWell variant="destructive">
        This organization does not have a subscription or billing information on
        file.
      </TextWell>
    );
  }

  if (UOrganization.subscriptionIsEnterprise(subscription)) {
    return (
      <TextWell>
        This is an Enterprise organization with a limit of{" "}
        {pluralize("seat", subscription.items.data[0].quantity || 0)}. Contact{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`} className={styledInlineA}>
          {SUPPORT_EMAIL}
        </a>{" "}
        to update any settings.
      </TextWell>
    );
  }

  const plan = subscription.items.data[0].plan;
  const amount = plan.amount! / 100;
  const quantity = subscription.items.data[0].quantity || 1;

  const { default_payment_method } = customer.invoice_settings;
  const card =
    typeof default_payment_method !== "string" && default_payment_method?.card;

  const couponName = subscription.discount?.coupon.name;
  const couponDescription =
    subscription.discount?.coupon?.metadata?.description;

  return (
    <TextWell size="md">
      <div>
        {statusLabels[subscription.status]}
        {subscription.status === "trialing" && subscription.trial_end ? (
          <span>
            , billing starts{" "}
            {new Date(subscription.trial_end * 1000).toLocaleDateString(
              "en-US",
              {
                month: "long",
                year: "numeric",
                day: "numeric",
              }
            )}
          </span>
        ) : null}
      </div>
      <div>
        {card ? (
          <span className="pr-2">
            {card.brand.toUpperCase()} ····
            {card.last4}
            {" exp. "}
            {card.exp_year}
          </span>
        ) : null}{" "}
        <div>
          {formatUSD(amount)}
          <span>
            {" "}
            × {quantity} members = {formatUSD(quantity * amount)}
          </span>
          /{plan.interval}
        </div>
      </div>
      {couponName ? (
        <div>
          Discount applied: {couponName}{" "}
          {couponDescription ? <>({couponDescription})</> : null}
        </div>
      ) : null}
    </TextWell>
  );
}

export default function SubscriptionForm() {
  const session = useAuthenticatedSession();
  const [{ customer }] = useQuery(getOrganization, null);

  if (!simpleRolesIsAuthorized({ session, roles: ["OWNER", "SUPERADMIN"] })) {
    return (
      <div>
        <CapsLabel>Billing</CapsLabel>
        <p>Billing information is available to organization owners.</p>
      </div>
    );
  }

  return (
    <div className="flex justify-between items-start">
      <div title={customer?.id || ""}>
        <CapsLabel>Billing</CapsLabel>
        {customer ? <SubscriptionSummary customer={customer} /> : null}
      </div>
      {customer?.deleted !== true && customer?.subscriptions?.data?.length ? (
        <ManageBilling />
      ) : (
        <RestartBilling />
      )}
    </div>
  );
}
