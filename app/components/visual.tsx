import { memo, Suspense } from "react";
import { LayersIcon, MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { useSetAtom } from "jotai";
import { dialogAtom } from "state/jotai";
import { Tooltip as T, Popover } from "radix-ui";
import * as E from "app/components/elements";
import { getIsMac, localizeKeybinding } from "app/lib/utils";
import { SEARCH_KEYBINDING } from "./dialogs/cheatsheet";
import { LayersPopover } from "./layers/popover";

export const Visual = memo(function Visual() {
  const setDialogState = useSetAtom(dialogAtom);
  const isMac = getIsMac();
  return (
    <div className="flex items-center">
      <div className="block h-10 w-10 p-1 flex items-stretch">
        <T.Root>
          <T.Trigger asChild>
            <E.Button
              variant="quiet"
              aria-label="Search"
              onClick={() => {
                setDialogState({ type: "quickswitcher" });
              }}
            >
              <MagnifyingGlassIcon />
            </E.Button>
          </T.Trigger>
          <E.TContent>
            <div className="flex items-center gap-x-2">
              Search{" "}
              <E.Keycap>
                {localizeKeybinding(SEARCH_KEYBINDING, isMac)}
              </E.Keycap>
            </div>
          </E.TContent>
        </T.Root>
      </div>

      <T.Root>
        <Popover.Root>
          <div className="h-10 w-10 p-1 flex items-stretch">
            <T.Trigger asChild>
              <Popover.Trigger aria-label="Layers" asChild>
                <E.Button variant="quiet">
                  <LayersIcon />
                </E.Button>
              </Popover.Trigger>
            </T.Trigger>
          </div>
          <E.PopoverContent2 size="md">
            <Suspense fallback={<E.Loading size="sm" />}>
              <LayersPopover />
            </Suspense>
          </E.PopoverContent2>
        </Popover.Root>
        <E.TContent side="bottom">
          <span className="whitespace-nowrap">Manage background layers</span>
        </E.TContent>
      </T.Root>
    </div>
  );
});
