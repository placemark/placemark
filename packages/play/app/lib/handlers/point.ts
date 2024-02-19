import { USelection } from "state";
import type { HandlerContext, Point } from "types";
import { modeAtom, Mode, selectionAtom, cursorStyleAtom } from "state/jotai";
import * as Sentry from "@sentry/nextjs";
import noop from "lodash/noop";
import { useSetAtom } from "jotai";
import { CURSOR_DEFAULT } from "app/lib/constants";
import { createOrUpdateFeature, getMapCoord } from "./utils";

export function usePointHandlers({
  dragTargetRef,
  mode,
  selection,
  featureMap,
  rep,
}: HandlerContext): Handlers {
  const setSelection = useSetAtom(selectionAtom);
  const setMode = useSetAtom(modeAtom);
  const setCursor = useSetAtom(cursorStyleAtom);
  const transact = rep.useTransact();
  const multi = mode.modeOptions?.multi;
  return {
    click: (e) => {
      if (!multi) {
        setMode({ mode: Mode.NONE });
      }

      const point: Point = {
        type: "Point",
        coordinates: getMapCoord(e),
      };

      const putFeature = createOrUpdateFeature({
        mode,
        selection,
        featureMap,
        geometry: point,
      });

      const id = putFeature.id;

      transact({
        note: "Drew a point",
        putFeatures: [putFeature],
      })
        .then(() => {
          if (!multi) {
            setSelection(USelection.single(id));
          }
        })
        .catch((e) => Sentry.captureException(e));
    },
    move: noop,
    down: noop,
    up() {
      dragTargetRef.current = null;
      setCursor(CURSOR_DEFAULT);
    },
    double: noop,
    enter() {
      setMode({ mode: Mode.NONE });
    },
  };
}
