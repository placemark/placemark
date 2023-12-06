import {
  BlitzPage,
  useParam,
  ErrorBoundary,
  ErrorFallbackProps,
} from "@blitzjs/next";
import { useQuery } from "@blitzjs/rpc";
import { Suspense, useRef } from "react";
import { Loading, styledInlineA, TextWell } from "app/components/elements";
import { LoggedOutAcceptForm } from "app/components/invitations/logged_out_accept_form";
import { LoggedInAcceptForm } from "app/components/invitations/logged_in_accept_form";
import StandaloneFormLayout from "app/core/layouts/standalone_form_layout";
import getMaybeCurrentUser from "app/users/queries/getMaybeCurrentUser";
import * as Sentry from "@sentry/nextjs";

export function InvitationError({ error }: ErrorFallbackProps) {
  Sentry.captureException(error);
  return (
    <TextWell variant="destructive">
      Unable to load the provided invitation.
    </TextWell>
  );
}

export function AcceptForm({ token }: { token: string | undefined }) {
  const [currentUser] = useQuery(getMaybeCurrentUser, null);
  /*
   * When going through LoggedOutAcceptForm, the value of currentUser
   * will switch to logged in. Record the first value to avoid this swap.
   */
  const loggedIn = useRef<typeof currentUser>(currentUser);

  if (typeof token !== "string" || !token) {
    Sentry.captureException(new Error("Invitation token missing"));

    return (
      <div>
        <h3 className="font-bold text-md">Error</h3>
        <p>
          The invitation token is missing from this page. If you’re copying &
          pasting the URL to this page, make sure to include the end of the URL
          with the token.
        </p>
        <p className="pt-4">
          If you encounter this error repeatedly, please{" "}
          <a
            className={styledInlineA}
            rel="noreferrer"
            href="https://www.placemark.io/documentation/contact"
          >
            contact us for help!
          </a>
        </p>
      </div>
    );
  }

  return loggedIn.current ? (
    <LoggedInAcceptForm token={token} currentUser={loggedIn.current} />
  ) : (
    <LoggedOutAcceptForm token={token} />
  );
}

const AcceptInvitationPage: BlitzPage = () => {
  const token = useParam("token", "string");

  return (
    <div>
      <ErrorBoundary fallbackRender={InvitationError}>
        <Suspense fallback={<Loading />}>
          <AcceptForm token={token} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
};

AcceptInvitationPage.getLayout = (page) => (
  <StandaloneFormLayout title="Accept invitation">{page}</StandaloneFormLayout>
);

export default AcceptInvitationPage;
