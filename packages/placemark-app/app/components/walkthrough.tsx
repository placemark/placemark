import { Slot } from "@radix-ui/react-slot";
import { Popover, PopoverAnchor } from "@radix-ui/react-popover";
import { Button, Keycap, StyledPopoverContent } from "./elements";
import * as Portal from "@radix-ui/react-portal";
import { useRect } from "@radix-ui/react-use-rect";
import { useId, useRef } from "react";
import { Measurable } from "@radix-ui/rect";
import { WalkthroughState } from "@prisma/client";
import { useWalkthrough } from "app/hooks/use_walkthrough";
import { getIsMac, localizeKeybinding } from "app/lib/utils";
import { SEARCH_KEYBINDING } from "./dialogs/cheatsheet";
import { Promisable } from "type-fest";
import toast from "react-hot-toast";

const WALKTHROUGH_CONTENT: Record<WalkthroughState, React.ReactNode> = {
  [WalkthroughState.V1_00_CREATEMAP]: (
    <>
      Welcome to Placemark! This is where your maps live. Start off by creating
      your first map!
    </>
  ),
  [WalkthroughState.V1_01_MENU]: (
    <>
      The File menu is where you’ll find the ability to open data from files or
      export it to any format you like. You can also drag & drop files onto the
      map!
    </>
  ),
  [WalkthroughState.V1_02_MODES]: (
    <>
      These buttons let you draw on the map - Point, Line, Polygon, and
      Rectangle.
    </>
  ),
  [WalkthroughState.V1_03_SEARCH]: (
    <div>
      Find a place on the map by clicking here to search. You can also hit
      <div className="inline-block px-2">
        <Keycap>{localizeKeybinding(SEARCH_KEYBINDING, getIsMac())}</Keycap>
      </div>
      to pull up search at any time.
    </div>
  ),
  [WalkthroughState.V1_03a_VISUAL]: (
    <>
      Switch the background map to Satellite imagery, a dark theme, or your
      custom map tiles here.
    </>
  ),
  [WalkthroughState.V1_04_SHARE]: (
    <>
      Share your map to the world and enable its API endpoints when you've got
      something you want to show the world!
    </>
  ),
  [WalkthroughState.V1_05_DONE]: null,
};

/**
 * Wraps a component with a UI that conditionally
 * highlights it and backlights the rest of the page,
 * as well as shows a tooltip.
 */
export function Step({
  id,
  onBeforeNext,
  ...props
}: React.PropsWithChildren<{
  id: WalkthroughState;
  onBeforeNext?: () => Promisable<void>;
}>) {
  const [active, { next, exit }] = useWalkthrough(id);
  const ref = useRef<Measurable>(null);
  const rect = useRect(ref.current);
  const slotId = useId();

  if (active) {
    return (
      <>
        <Portal.Root>
          <div
            className="mix-blend-hard-light absolute inset-0 z-10"
            style={{
              background: "rgba(0, 0, 0, 0.3)",
            }}
            onClick={() => {
              exit();
              toast.success(
                `You can go back through the tour at any time by going to your account settings!`
              );
            }}
          >
            {rect ? (
              <label
                className="block absolute rounded-lg"
                htmlFor={slotId}
                style={{
                  background: "gray",
                  top: rect.top - 5,
                  left: rect.left - 5,
                  width: rect.width + 10,
                  height: rect.height + 10,
                }}
              ></label>
            ) : null}
          </div>
        </Portal.Root>
        <Popover open={true}>
          <PopoverAnchor>
            <Slot {...props} ref={ref as any} id={slotId} />
          </PopoverAnchor>
          <StyledPopoverContent sideOffset={10}>
            <div>{WALKTHROUGH_CONTENT[id]}</div>
            <div className="pt-6 flex justify-between flex-row-reverse">
              <Button
                size="sm"
                variant="primary"
                onClick={async () => {
                  if (onBeforeNext) {
                    await onBeforeNext();
                  }
                  next();
                }}
              >
                Next
              </Button>
              <Button
                size="sm"
                variant="quiet"
                onClick={() => {
                  exit();
                }}
              >
                Exit
              </Button>
            </div>
          </StyledPopoverContent>
        </Popover>
      </>
    );
  }

  return <Slot {...props} ref={ref as any} />;
}
