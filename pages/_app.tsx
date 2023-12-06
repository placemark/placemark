import { withBlitz } from "app/blitz-client";
import { useQueryErrorResetBoundary } from "@blitzjs/rpc";
import {
  AppProps,
  ErrorFallbackProps,
  ErrorBoundary,
  ErrorComponent,
} from "@blitzjs/next";
import P404 from "pages/404";
import "@stripe/stripe-js";
import "../styles/globals.css";
import * as T from "@radix-ui/react-tooltip";
import SigninForm from "app/auth/components/SigninForm";
import StandaloneFormLayout from "app/core/layouts/standalone_form_layout";
import * as Sentry from "@sentry/nextjs";
import { QueryClientProvider, QueryClient } from "react-query";
import { AuthenticationError, AuthorizationError, RedirectError } from "blitz";
import { usePostHog } from "integrations/posthog_client";
import dynamic from "next/dynamic";
import "core-js/features/array/at";

const RouterProgressBar = dynamic(
  () =>
    import("app/components/router_progress_bar").then(
      (m) => m.RouterProgressBar
    ),
  {
    ssr: false,
  }
);

const queryClient = new QueryClient();

export default withBlitz(function App({ Component, pageProps }: AppProps) {
  usePostHog();
  const getLayout = Component.getLayout || ((page) => page);

  return (
    <QueryClientProvider client={queryClient}>
      <T.Provider>
        <ErrorBoundary
          FallbackComponent={RootErrorFallback}
          onReset={useQueryErrorResetBoundary().reset}
          onError={(error) => {
            // Don't report RedirectError instances
            if (error instanceof RedirectError) {
              return;
            }
            Sentry.captureException(error);
          }}
        >
          <RouterProgressBar />
          {getLayout(<Component {...pageProps} />)}
        </ErrorBoundary>
      </T.Provider>
    </QueryClientProvider>
  );
});

function RootErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  if (error instanceof AuthenticationError) {
    return (
      <StandaloneFormLayout title="Sign in">
        <SigninForm onSuccess={resetErrorBoundary} />
      </StandaloneFormLayout>
    );
  } else if (error instanceof AuthorizationError) {
    return (
      <ErrorComponent
        statusCode={error.statusCode}
        title="Sorry, you are not authorized to access this"
      />
    );
  } else {
    switch (error.statusCode) {
      case 404:
        return <P404 />;
      default:
        return (
          <ErrorComponent
            statusCode={error.statusCode || 400}
            title={error.message || error.name}
          />
        );
    }
  }
}
