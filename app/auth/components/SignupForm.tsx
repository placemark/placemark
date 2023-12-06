import { useQuery } from "@blitzjs/rpc";
import { styledInlineA, TextWell } from "app/components/elements";
import getSubscriptionDetails from "app/users/queries/getSubscriptionDetails";
import { AlreadyHaveAccount } from "app/components/already_have_account";

export const SignupForm = () => {
  const [subscriptionDetails] = useQuery(getSubscriptionDetails, {});
  const { price } = subscriptionDetails;

  return (
    <div>
      <div className="pb-3">
        {price ? (
          <TextWell>
            {subscriptionDetails.trial}-day free trial, then $
            {(price.unit_amount ?? 0) / 100}
            /month.
          </TextWell>
        ) : null}
      </div>
      <div>
        <div>
          Signing up for Placemark is disabled, see{" "}
          <a href="https://www.placemark.io/post/placemark-is-winding-down">
            this blog post
          </a>{" "}
          for details.
        </div>
      </div>
      <div className="text-sm pt-10">
        By signing up, you agree to our{" "}
        <a
          className={styledInlineA}
          href="https://www.placemark.io/documentation/terms-of-service"
        >
          Terms of Service
        </a>
        {" and "}
        <a
          className={styledInlineA}
          href="https://www.placemark.io/documentation/privacy"
        >
          Privacy policy
        </a>
        .
      </div>
      <AlreadyHaveAccount />
    </div>
  );
};
