import { BlitzPage, Routes } from "@blitzjs/next";
import { useRouter } from "next/router";
import { Suspense } from "react";
import { Loading } from "app/components/elements";
import StandaloneFormLayout from "app/core/layouts/standalone_form_layout";
import { AuthorizationError } from "blitz";
import * as Sentry from "@sentry/nextjs";
import toast from "react-hot-toast";
import Form from "app/core/components/Form";
import { PauseMemberships } from "app/memberships/validations";
import pauseMemberships from "app/memberships/mutations/pauseMemberships";
import { useMutation } from "@blitzjs/rpc";

function PauseForm() {
  const Router = useRouter();
  const [pauseMembershipMutation] = useMutation(pauseMemberships);

  return (
    <div className="space-y-4">
      <Form
        submitText="Pause membership"
        schema={PauseMemberships}
        initialValues={{}}
        onSubmit={async () => {
          try {
            await pauseMembershipMutation({});
            toast.success("Membership paused, logging out");
            await Router.push(Routes.LogoutPage());
          } catch (e) {
            if (e instanceof AuthorizationError) {
              toast.error(e.message);
            } else {
              toast.error("Sorry, could not pause membership");
              Sentry.captureException(e);
            }
          }
        }}
      >
        <p>
          You can pause your membership to your organizations if you aren’t
          using it for extended periods of time. What will happen:
        </p>
        <ul className="list-disc pl-4 pt-4 space-y-4">
          <li>
            Your team won’t be charged for your seat while your account is
            paused.
          </li>
          <li>
            This will log you out. If you log back in, your account is unpaused.
          </li>
        </ul>
      </Form>
    </div>
  );
}

const PauseMembershipPage: BlitzPage = () => {
  return (
    <div>
      <Suspense fallback={<Loading />}>
        <PauseForm />
      </Suspense>
    </div>
  );
};

PauseMembershipPage.getLayout = (page) => (
  <StandaloneFormLayout title="Pause membership">{page}</StandaloneFormLayout>
);

export default PauseMembershipPage;
