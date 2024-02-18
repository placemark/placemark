import { BlitzPage, ErrorBoundary } from "@blitzjs/next";
import { useRouter } from "next/router";
import { Suspense } from "react";
import { Loading } from "app/components/elements";
import StandaloneFormLayout from "app/core/layouts/standalone_form_layout";
import { AcceptForm, InvitationError } from "pages/accept-invitation/[token]";

const LegacyAcceptInvitationPage: BlitzPage = () => {
  const query = useRouter().query;
  const token = query.token as string;

  if (!token) {
    return <Loading />;
  }

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

LegacyAcceptInvitationPage.getLayout = (page) => (
  <StandaloneFormLayout title="Accept invitation">{page}</StandaloneFormLayout>
);

export default LegacyAcceptInvitationPage;
