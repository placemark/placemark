import { useHotkeys } from "integrations/hotkeys";
import { useSetAtom } from "jotai";
import { dialogAtom } from "state/jotai";
import { posthog } from "integrations/posthog_client";

export function KeybindingsIndex() {
  const setDialogState = useSetAtom(dialogAtom);

  useHotkeys(
    "/",
    (e) => {
      e.preventDefault();
      setDialogState({ type: "quickswitcher_index" });
      posthog?.capture("open-quickswitcher-index", {
        method: "keybinding",
      });
    },
    [setDialogState]
  );

  useHotkeys(
    "meta+k, Ctrl+k",
    (e) => {
      e.preventDefault();
      setDialogState({ type: "quickswitcher_index" });
      posthog?.capture("open-quickswitcher-index", {
        method: "keybinding",
      });
    },
    [setDialogState]
  );

  return null;
}
