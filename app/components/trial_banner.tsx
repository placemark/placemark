import { Suspense } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "@blitzjs/rpc";
import { ErrorBoundary, Routes } from "@blitzjs/next";
import getOrganization from "app/organizations/queries/getOrganization";
import { match } from "ts-pattern";
import { Button, styledInlineA, TextWell } from "./elements";
import fromUnixTime from "date-fns/fromUnixTime";
import differenceInDays from "date-fns/differenceInDays";
import customerPortal from "app/organizations/mutations/customerPortal";
import { posthog } from "integrations/posthog_client";
import { env } from "app/lib/env_client";

function TrialBannerFallback() {
  return null;
}

export function TrialBanner() {
  return (
    <ErrorBoundary FallbackComponent={TrialBannerFallback}>
      <Suspense fallback={null}>
        <TrialBannerInner />
      </Suspense>
    </ErrorBoundary>
  );
}

function TrialBannerInner() {
  const [customerPortalMutation] = useMutation(customerPortal);
  const [organization] = useQuery(getOrganization, null);
  const customer = organization.customer;
  const subscription = !customer?.deleted && customer?.subscriptions?.data[0];

  if (!subscription && env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY !== "off") {
    return (
      <div className="pb-4">
        <TextWell variant="destructive">
          You don’t have an active subscription.{" "}
          <Link href={Routes.SettingsOrganization()} className={styledInlineA}>
            Set up billing to keep your maps online.
          </Link>
          {env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}
        </TextWell>
      </div>
    );
  }

  // Stripe is disabled
  if (!subscription) return null;

  // https://stripe.com/docs/billing/subscriptions/overview#subscription-statuses
  return (
    match(subscription)
      .with({ status: "trialing" }, () => {
        const paymentMethod = customer?.invoice_settings.default_payment_method;
        const { trial_end, default_payment_method: subscriptionPaymentMethod } =
          subscription;
        if (subscriptionPaymentMethod || paymentMethod || trial_end === null) {
          return null;
        }
        const daysRemaining = differenceInDays(
          fromUnixTime(trial_end),
          new Date()
        );
        return (
          <div className="pb-4">
            <TextWell variant="primary">
              <div className="md:flex items-center justify-between">
                Your trial ends in {daysRemaining} days. Add a payment method to
                keep using Placemark{" "}
                <Button
                  onClick={async () => {
                    posthog?.capture("add-payment-method-click");

                    const { url } = await customerPortalMutation({});
                    // Sketchy, I don't think Stripe guarantees
                    // URLs.
                    window.location.href = `${url}/payment-methods`;
                  }}
                >
                  Add payment method
                </Button>
              </div>
            </TextWell>
          </div>
        );
      })
      .with({ status: "trialing" }, () => {
        return null;
      })
      .with({ status: "active" }, () => {
        return null;
      })
      .with({ status: "past_due" }, () => {
        return (
          <div className="pb-4">
            <TextWell variant="destructive">
              Your last invoice is past due.{" "}
              <Link
                href={Routes.SettingsOrganization()}
                className={styledInlineA}
              >
                Update billing in settings to fix this.
              </Link>
            </TextWell>
          </div>
        );
      })
      // This will never occur because cancelled subscriptions
      // don’t get included in the response.
      .with({ status: "canceled" }, () => null)
      .with({ status: "unpaid" }, () => null)
      .with({ status: "incomplete" }, () => null)
      .with({ status: "incomplete_expired" }, () => null)
      .exhaustive()
  );
}
