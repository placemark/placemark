import { memo, Suspense } from "react";
import { LayersIcon, MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { useSetAtom } from "jotai";
import { dialogAtom } from "state/jotai";
import * as T from "@radix-ui/react-tooltip";
import * as E from "app/components/elements";
import { Root, Trigger } from "@radix-ui/react-popover";
import { getIsMac, localizeKeybinding } from "app/lib/utils";
import { SEARCH_KEYBINDING } from "./dialogs/cheatsheet";
import { posthog } from "integrations/posthog_client";
import { Step } from "./walkthrough";
import { LayersPopover } from "./layers/popover";

export const Visual = memo(function Visual() {
  const setDialogState = useSetAtom(dialogAtom);
  const isMac = getIsMac();
  return (
    <div className="flex items-center">
      <div className="block h-10 w-10 p-1 flex items-stretch">
        <T.Root>
          <Step id="V1_03_SEARCH">
            <T.Trigger asChild>
              <E.Button
                variant="quiet"
                aria-label="Search"
                onClick={() => {
                  posthog.capture("open-quickswitcher", {
                    method: "click",
                  });
                  setDialogState({ type: "quickswitcher" });
                }}
              >
                <MagnifyingGlassIcon />
              </E.Button>
            </T.Trigger>
          </Step>
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
        <Root>
          <div className="h-10 w-10 p-1 flex items-stretch">
            <Step id="V1_03a_VISUAL">
              <T.Trigger asChild>
                <Trigger aria-label="Layers" asChild>
                  <E.Button variant="quiet">
                    <LayersIcon />
                  </E.Button>
                </Trigger>
              </T.Trigger>
            </Step>
          </div>
          <E.PopoverContent2 size="md">
            <Suspense fallback={<E.Loading size="sm" />}>
              <LayersPopover />
            </Suspense>
          </E.PopoverContent2>
        </Root>
        <E.TContent side="bottom">
          <span className="whitespace-nowrap">Manage background layers</span>
        </E.TContent>
      </T.Root>
    </div>
  );
});
