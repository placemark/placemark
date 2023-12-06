import posthog from "posthog-js";
import { useSession } from "@blitzjs/auth";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { env } from "app/lib/env_client";

export { posthog };

export const usePostHog = () => {
  const router = useRouter();

  useEffect(() => {
    posthog.init(env.NEXT_PUBLIC_POSTHOG_API_TOKEN, {
      api_host: env.NEXT_PUBLIC_POSTHOG_API_HOST,
      autocapture: false,
    });

    const handleRouteChange = () => posthog.capture("$pageview");
    router.events.on("routeChangeComplete", handleRouteChange);
    return () => {
      router.events.off("routeChangeComplete", handleRouteChange);
    };
  }, [router.events]);

  const session = useSession({
    suspense: false,
  });

  useEffect(() => {
    if (session.userId !== null) {
      posthog.identify(String(session.userId));
    }
  }, [session.userId]);
};
