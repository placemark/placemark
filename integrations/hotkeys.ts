import * as Sentry from "@sentry/nextjs";
import { posthog } from "integrations/posthog_client";
import { useHotkeys as rawUseHotkeys } from "react-hotkeys-hook";

type Params = Parameters<typeof rawUseHotkeys>;

export function useHotkeys(
  keys: Params[0],
  fn: Params[1],
  a: Params[2],
  b?: Params[3]
) {
  const wrap: Params[1] = (...args) => {
    const message = typeof keys === "string" ? keys : keys.join(",");
    Sentry.addBreadcrumb({
      category: "keyboardshortcut",
      message,
      level: "info",
    });
    posthog.capture("keyboard-shortcut", { keys: message });
    return fn(...args);
  };
  return rawUseHotkeys(keys, wrap, a, b);
}
