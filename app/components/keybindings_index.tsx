import { useHotkeys } from "integrations/hotkeys";
import { useSetAtom } from "jotai";
import { dialogAtom } from "state/jotai";

export function KeybindingsIndex() {
  const setDialogState = useSetAtom(dialogAtom);

  useHotkeys(
    "/",
    (e) => {
      e.preventDefault();
      setDialogState({ type: "quickswitcher_index" });
    },
    [setDialogState]
  );

  useHotkeys(
    "meta+k, Ctrl+k",
    (e) => {
      e.preventDefault();
      setDialogState({ type: "quickswitcher_index" });
    },
    [setDialogState]
  );

  return null;
}
