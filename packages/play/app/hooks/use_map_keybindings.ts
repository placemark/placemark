import type { Options } from "react-hotkeys-hook";
import { useHotkeys } from "integrations/hotkeys";
import { dataAtom, selectionAtom } from "state/jotai";
import * as Sentry from "@sentry/nextjs";
import { usePersistence } from "app/lib/persistence/context";
import { deleteFeatures } from "app/lib/map_operations/delete_features";
import { filterLockedFeatures } from "app/lib/folder";
import { USelection } from "state";
import { useCallback } from "react";
import { useAtomCallback } from "jotai/utils";

const IGNORE_ROLES = new Set(["menuitem"]);

export const keybindingOptions: Options = {
  enabled(e) {
    try {
      return !IGNORE_ROLES.has((e.target as HTMLElement).getAttribute("role")!);
    } catch (e) {
      return true;
    }
  },
};

function shouldControlTree(e: Event) {
  return (
    "target" in e &&
    e.target instanceof HTMLElement &&
    e.target.closest('[data-keybinding-scope="editor_folder"]')
  );
}

export function useMapKeybindings() {
  const rep = usePersistence();
  const historyControl = rep.useHistoryControl();
  const transact = rep.useTransact();

  useHotkeys(
    "meta+z, Ctrl+z",
    (e) => {
      e.preventDefault();
      historyControl("undo").catch((e) => Sentry.captureException(e));
      return false;
    },
    [historyControl]
  );

  useHotkeys(
    "meta+shift+z, Ctrl+shift+z",
    (_e: KeyboardEvent) => {
      historyControl("redo").catch((e) => Sentry.captureException(e));
    },
    [historyControl]
  );

  const maybeToggleFolder = useAtomCallback(
    useCallback(
      (get, set, expanded: boolean) => {
        const data = get(dataAtom);
        const { selection } = data;

        const folderId = USelection.folderId(selection);

        if (folderId) {
          const folder = data.folderMap.get(folderId);
          if (folder) {
            void transact({
              note: "Toggled a folder",
              putFolders: [
                {
                  ...folder,
                  expanded,
                },
              ],
            });
          }
        } else if (!expanded) {
          set(selectionAtom, USelection.selectionToFolder(data));
        }
      },
      [transact]
    )
  );

  useHotkeys(
    "arrowright",
    (e) => {
      if (shouldControlTree(e)) {
        e.preventDefault();
        void maybeToggleFolder(true);
      }
    },
    keybindingOptions,
    [maybeToggleFolder]
  );

  useHotkeys(
    "arrowleft",
    (e) => {
      if (shouldControlTree(e)) {
        e.preventDefault();
        void maybeToggleFolder(false);
      }
    },
    keybindingOptions,
    [maybeToggleFolder]
  );

  const onSelectAll = useAtomCallback(
    useCallback((get, set) => {
      const data = get(dataAtom);
      set(selectionAtom, {
        type: "multi",
        ids: filterLockedFeatures(data).map((f) => f.id),
      });
    }, [])
  );

  useHotkeys(
    "meta+a, Ctrl+a",
    (e) => {
      e.preventDefault();
      void onSelectAll();
    },
    keybindingOptions,
    [onSelectAll]
  );

  const onDelete = useAtomCallback(
    useCallback(
      (get, set) => {
        const data = get(dataAtom);
        set(selectionAtom, USelection.none());
        (async () => {
          const { newSelection, moment } = deleteFeatures(data);
          set(selectionAtom, newSelection);
          await transact(moment);
        })().catch((e) => Sentry.captureException(e));
        return false;
      },
      [transact]
    )
  );

  useHotkeys(
    "Backspace, delete",
    (e) => {
      e.preventDefault();
      void onDelete();
    },
    keybindingOptions,
    [onDelete]
  );
}
