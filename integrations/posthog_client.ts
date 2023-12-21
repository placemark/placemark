import ph from "posthog-js";
import { useSession } from "@blitzjs/auth";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { env } from "app/lib/env_client";

export const posthog = env.NEXT_PUBLIC_POSTHOG_API_TOKEN === "off" ? null : ph;

export const usePostHog = () => {
  if (env.NEXT_PUBLIC_POSTHOG_API_TOKEN === "off") {
    return null;
  }
  const router = useRouter();

  useEffect(() => {
    ph.init(env.NEXT_PUBLIC_POSTHOG_API_TOKEN, {
      api_host: env.NEXT_PUBLIC_POSTHOG_API_HOST,
      autocapture: false,
    });

    const handleRouteChange = () => ph.capture("$pageview");
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
      ph?.identify(String(session.userId));
    }
  }, [session.userId]);
};
