import { useMutation } from "@blitzjs/rpc";
import { BlitzPage } from "@blitzjs/next";
import { useRouter } from "next/router";
import * as Sentry from "@sentry/nextjs";
import StandaloneFormLayout from "app/core/layouts/standalone_form_layout";
import { useEffect } from "react";
import { Loading } from "app/components/elements";
import logout from "app/auth/mutations/logout";
import { posthog } from "integrations/posthog_client";

const LogoutPage: BlitzPage = () => {
  const router = useRouter();
  const [logoutMutation] = useMutation(logout);

  useEffect(() => {
    posthog?.reset();
    logoutMutation()
      .then(() => {
        void router.push("/");
      })
      .catch((e) => {
        Sentry.captureException(e);
        void router.push("/");
      });
  }, [logoutMutation, router]);

  return <Loading />;
};

LogoutPage.getLayout = (page) => (
  <StandaloneFormLayout title="Logging out…">{page}</StandaloneFormLayout>
);

export default LogoutPage;
