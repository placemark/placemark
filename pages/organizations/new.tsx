import { useMutation } from "@blitzjs/rpc";
import { BlitzPage } from "@blitzjs/next";
import AuthenticatedPageLayout from "app/core/layouts/authenticated_page_layout";
import createOrganization from "app/organizations/mutations/createOrganization";
import { CreateOrganization } from "app/organizations/validations";
import { loadStripe } from "@stripe/stripe-js";
import { env } from "app/lib/env_client";
import {
  OrganizationForm,
  FORM_ERROR,
} from "app/organizations/components/OrganizationForm";

const NewOrganization: BlitzPage = () => {
  const [createOrganizationMutation] = useMutation(createOrganization);

  return (
    <div>
      <OrganizationForm
        submitText="Set up billing"
        schema={CreateOrganization}
        initialValues={{
          name: "",
        }}
        onSubmit={async (values) => {
          try {
            const sessionId = await createOrganizationMutation(values);
            const stripe = await loadStripe(
              env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
            );
            if (!stripe) throw new Error("Could not load Stripe");
            await stripe.redirectToCheckout({
              sessionId,
            });
          } catch (error: any) {
            // console.error(error);
            return {
              [FORM_ERROR]: (error as Error).toString(),
            };
          }
        }}
      />
    </div>
  );
};

NewOrganization.authenticate = true;
NewOrganization.getLayout = (page) => (
  <AuthenticatedPageLayout title="Create a new organization">
    {page}
  </AuthenticatedPageLayout>
);

export default NewOrganization;
