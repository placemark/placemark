import {
  DotFilledIcon,
  SquareIcon,
  PlusIcon,
  DownloadIcon,
} from "@radix-ui/react-icons";
import * as Sentry from "@sentry/nextjs";
import Line from "app/components/icons/line";
import { useOpenFiles } from "app/hooks/use_open_files";
import { useSetAtom } from "jotai";
import { memo } from "react";
import { dialogAtom } from "state/dialog_state";
import { Button } from "./elements";
import SvgPolygon from "./icons/polygon";

export const NothingSelected = memo(function NothingSelected() {
  const openFiles = useOpenFiles();
  const setDialogState = useSetAtom(dialogAtom);
  return (
    <div className="px-3 pt-3 overflow-y-auto pb-4 text-gray-900 dark:text-gray-300 flex-auto placemark-scrollbar">
      <div className="text-sm font-semibold pb-2">
        Select a drawing tool from the menu
      </div>
      <div
        className="grid gap-x-2 gap-y-4 items-start p-2 text-sm"
        style={{
          gridTemplateColumns: "min-content 1fr",
        }}
      >
        <div className="pt-1">
          <DotFilledIcon />
        </div>
        <div>Draw points by clicking</div>
        <div className="pt-1">
          <Line />
        </div>
        <div>
          Click to draw vertexes along a line. Finish the line by
          double-clicking or pressing Enter or Escape.
        </div>
        <div className="pt-1">
          <SvgPolygon />
        </div>
        <div>
          Click to draw vertexes for a polygon. Finish the polygon by clicking
          the first point or pressing Enter or Escape.
        </div>
        <div className="pt-1">
          <SquareIcon />
        </div>
        <div>
          Draw a rectangle by clicking and dragging to define the rectangle's
          size.
        </div>
      </div>
      <div className="pt-4 space-y-3">
        <div className="text-sm font-semibold">Working with files</div>
        <div className="flex items-center gap-x-2">
          <Button
            type="button"
            onClick={() => {
              openFiles().catch((e) => Sentry.captureException(e));
            }}
          >
            <PlusIcon />
            Import
          </Button>
          <Button
            type="button"
            onClick={() => {
              setDialogState({ type: "export" });
            }}
          >
            <DownloadIcon />
            Export
          </Button>
        </div>
      </div>
    </div>
  );
});
