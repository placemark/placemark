import { USelection } from "state";
import type { HandlerContext, IFeature, LineString, Position } from "types";
import { selectionAtom, modeAtom, Mode, cursorStyleAtom } from "state/jotai";
import * as Sentry from "@sentry/nextjs";
import * as utils from "app/lib/map_component_utils";
import replaceCoordinates from "app/lib/replace_coordinates";
import { useSetAtom } from "jotai";
import { usePopMoment } from "app/lib/persistence/shared";
import { CURSOR_DEFAULT } from "app/lib/constants";
import { createOrUpdateFeature, getMapCoord } from "./utils";
import { useRef } from "react";
import { lockDirection, useShiftHeld } from "app/hooks/use_held";

export function useLineHandlers({
  rep,
  featureMap,
  folderMap,
  selection,
  mode,
  dragTargetRef,
}: HandlerContext): Handlers {
  const multi = mode.modeOptions?.multi;
  const setSelection = useSetAtom(selectionAtom);
  const setMode = useSetAtom(modeAtom);
  const setCursor = useSetAtom(cursorStyleAtom);
  const transact = rep.useTransact();
  const popMoment = usePopMoment();
  const usingTouchEvents = useRef<boolean>(false);
  const shiftHeld = useShiftHeld();

  const handlers: Handlers = {
    click: (e) => {
      const { modeOptions } = mode;

      if (selection.type === "none" || selection.type === "folder") {
        /**
         * Drawing a new line: create the line and set the new
         * selection
         */
        const lineString = utils.newLineStringFromClickEvent(e);

        const putFeature = createOrUpdateFeature({
          mode,
          selection,
          featureMap,
          geometry: lineString,
        });

        const id = putFeature.id;
        transact({
          note: "Drew a line",
          putFeatures: [putFeature],
        }).catch((e) => Sentry.captureException(e));
        setSelection(USelection.single(id));
      } else if (selection.type === "single") {
        /**
         * Appending to an existing line. Push a coordinate
         * onto it.
         */
        const position = getMapCoord(e);
        const wrappedFeature = featureMap.get(selection.id);
        if (!wrappedFeature) {
          setSelection(USelection.none());
          return;
        }
        const feature = wrappedFeature.feature as IFeature<LineString>;
        void transact({
          note: "Added to line",
          putFeatures: [
            {
              ...wrappedFeature,
              feature: replaceCoordinates(
                feature,
                modeOptions?.reverse
                  ? [position as Position].concat(feature.geometry.coordinates)
                  : feature.geometry.coordinates.concat([position])
              ),
            },
          ],
        })
          .catch((e) => Sentry.captureException(e))
          .then(() => {
            // console.log("processed click");
          });
      }
    },

    /**
     * These are ephemeral states. While you're moving the mouse
     * while drawing a linestring, the final point of the line string
     * isn't "real" yet. It's ephemeral. This sets the _state_ for that
     * part of the line, which is combined into the data sent to the
     * map at the very last minute.
     */
    move: (e) => {
      const { modeOptions } = mode;
      if (selection.type !== "single") return;

      /**
       * Ignore mousemove events produced by the Apple Pencil.
       */
      if (e.type === "mousemove" && usingTouchEvents.current) {
        return;
      }
      const wrappedFeature = featureMap.get(selection.id);
      if (!wrappedFeature) {
        Sentry.captureMessage("Unexpected missing wrapped feature");
        return;
      }
      const feature = wrappedFeature.feature as IFeature<LineString>;

      let nextCoord = getMapCoord(e) as Position;
      const lastCoord = feature.geometry.coordinates.at(-2);
      if (shiftHeld.current && lastCoord) {
        nextCoord = lockDirection(lastCoord, nextCoord);
      }

      void transact({
        putFeatures: [
          {
            ...wrappedFeature,
            feature: replaceCoordinates(
              feature,
              modeOptions?.reverse
                ? [nextCoord].concat(feature.geometry.coordinates.slice(1))
                : feature.geometry.coordinates.slice(0, -1).concat([nextCoord])
            ),
          },
        ],
        quiet: true,
      })
        .catch((e) => Sentry.captureException(e))
        .then(() => {
          // console.log("processed move");
        });
    },

    touchstart: (e) => {
      usingTouchEvents.current = true;
      e.preventDefault();
    },

    touchmove: (e) => {
      handlers.move(e);
    },

    touchend: (e) => {
      handlers.click(e);
    },

    down: (e) => {
      if (e.type === "mousedown") {
        usingTouchEvents.current = false;
      }
    },
    up() {
      dragTargetRef.current = null;
      setCursor(CURSOR_DEFAULT);
    },
    double: (e) => {
      const { modeOptions } = mode;
      if (selection?.type !== "single") return;

      // Assuming that browser are following standard event order
      // of two clicks & a dblclick, the second point should be dropped.
      const wrappedFeature = featureMap.get(selection.id);
      if (!wrappedFeature) {
        setSelection(USelection.none());
        return;
      }
      if (!multi) {
        setMode({ mode: Mode.NONE });
      } else {
        setSelection(
          USelection.selectionToFolder({
            selection,
            folderMap,
            featureMap,
          })
        );
      }
      e.preventDefault();

      const feature = wrappedFeature.feature as IFeature<LineString>;
      const finalFeature = replaceCoordinates(
        feature,
        modeOptions?.reverse
          ? feature.geometry.coordinates.slice(2)
          : feature.geometry.coordinates.slice(0, -2)
      );
      void popMoment(2);
      transact({
        putFeatures: [
          {
            ...wrappedFeature,
            feature: finalFeature,
          },
        ],
        quiet: true,
      }).catch((e) => Sentry.captureException(e));
    },
    enter() {
      setMode({ mode: Mode.NONE });
      if (selection.type !== "single") return;

      // From here on out, we're re-entering this line mode. There's
      // already a line on the map, and we are continuing it.
      const selected = featureMap.get(selection.id);

      if (!selected) {
        setSelection(USelection.none());
        return;
      }

      const feature = selected.feature as IFeature<LineString>;

      transact({
        putFeatures: [
          {
            ...selected,
            feature: replaceCoordinates(
              feature,
              feature.geometry.coordinates.length > 2
                ? mode.modeOptions?.reverse
                  ? feature.geometry.coordinates.slice(1)
                  : feature.geometry.coordinates.slice(0, -1)
                : feature.geometry.coordinates
            ),
          },
        ],
      }).catch((e) => Sentry.captureException(e));
    },
  };

  return handlers;
}
