import { USelection } from "state";
import type { HandlerContext, IFeature, Polygon } from "types";
import { modeAtom, Mode, selectionAtom, cursorStyleAtom } from "state/jotai";
import * as utils from "app/lib/map_component_utils";
import * as Sentry from "@sentry/nextjs";
import replaceCoordinates from "app/lib/replace_coordinates";
import { decodeId } from "app/lib/id";
import { useSetAtom } from "jotai";
import { usePopMoment } from "app/lib/persistence/shared";
import { closePolygon } from "app/lib/map_operations";
import { CURSOR_DEFAULT, DECK_SYNTHETIC_ID } from "app/lib/constants";
import { UIDMap } from "app/lib/id_mapper";
import { createOrUpdateFeature, getMapCoord } from "./utils";
import { useRef } from "react";
import { lockDirection, useShiftHeld } from "app/hooks/use_held";

export function usePolygonHandlers({
  rep,
  mode,
  selection,
  idMap,
  featureMap,
  folderMap,
  dragTargetRef,
  pmap,
}: HandlerContext): Handlers {
  const multi = mode.modeOptions?.multi;
  const setSelection = useSetAtom(selectionAtom);
  const setMode = useSetAtom(modeAtom);
  const setCursor = useSetAtom(cursorStyleAtom);
  const popMoment = usePopMoment();
  const transact = rep.useTransact();
  /**
   * Workarounds for Apple Pencil (same as in line drawing)
   */
  const usingTouchEvents = useRef<boolean>(false);

  const shiftHeld = useShiftHeld();

  const handlers: Handlers = {
    click: (e) => {
      let nextCoord = getMapCoord(e);

      // Starting a new polygon
      if (selection.type !== "single") {
        const polygon = utils.newPolygonFromClickEvent(e);
        const putFeature = createOrUpdateFeature({
          featureMap,
          geometry: polygon,
          mode,
          selection,
        });
        const id = putFeature.id;
        transact({
          note: "Drew a polygon",
          putFeatures: [putFeature],
        })
          .then(() => {
            setSelection(USelection.single(id));
          })
          .catch((e) => Sentry.captureException(e));
        return;
      }

      const clickedFeatures = pmap.overlay.pickMultipleObjects({
        ...e.point,
        layerIds: [DECK_SYNTHETIC_ID],
      });

      const wrappedFeature = featureMap.get(selection.id);

      if (!wrappedFeature) {
        setSelection(USelection.none());
        return;
      }

      const feature = wrappedFeature.feature as IFeature<Polygon>;

      // Ending a polygon
      if (
        clickedFeatures.some((feature) => {
          if (feature.object?.id === undefined) return false;
          const id = decodeId(feature.object.id as RawId);
          return (
            id.type === "vertex" &&
            UIDMap.getUUID(idMap, id.featureId) === selection.id &&
            id.vertex === 0
          );
        })
      ) {
        const ring = feature.geometry.coordinates[0];
        const firstPoint = ring[0].slice();
        const newRing = feature.geometry.coordinates[0]
          .slice(0, -2)
          .concat([firstPoint]);
        const finalFeature = replaceCoordinates(feature, [newRing]);

        transact({
          putFeatures: [
            {
              ...wrappedFeature,
              feature: finalFeature,
            },
          ],
          quiet: true,
        })
          .then(() => {
            setMode({ mode: Mode.NONE });
          })
          .catch((e) => Sentry.captureException(e));
        return;
      }

      const lastCoord = feature.geometry.coordinates[0].at(-3);
      if (shiftHeld.current && lastCoord) {
        nextCoord = lockDirection(lastCoord, nextCoord);
      }

      // Adding a vertex to a polygon
      const newRing = feature.geometry.coordinates[0].slice();
      newRing.splice(-2, 0, nextCoord);
      transact({
        putFeatures: [
          {
            ...wrappedFeature,
            feature: replaceCoordinates(feature, [newRing]),
          },
        ],
        note: "Added a vertex to a polygon",
      }).catch((e) => Sentry.captureException(e));
      return;
    },

    move: (e) => {
      if (selection?.type !== "single") return;

      /**
       * Ignore mousemove events produced by the Apple Pencil.
       */
      if (e.type === "mousemove" && usingTouchEvents.current) {
        return;
      }

      let nextCoord = getMapCoord(e);

      const wrappedFeature = featureMap.get(selection.id);

      if (!wrappedFeature) {
        setSelection(USelection.none());
        return;
      }

      const feature = wrappedFeature.feature as IFeature<Polygon>;

      const lastCoord = feature.geometry.coordinates[0].at(-3);
      if (shiftHeld.current && lastCoord) {
        nextCoord = lockDirection(lastCoord, nextCoord);
      }

      const newRing = feature.geometry.coordinates[0].slice();
      newRing[newRing.length - 2] = nextCoord;
      transact({
        putFeatures: [
          {
            ...wrappedFeature,
            feature: replaceCoordinates(feature, [newRing]),
          },
        ],
        quiet: true,
      }).catch((e) => Sentry.captureException(e));
    },
    down: (e) => {
      if (e.type === "mousedown") {
        usingTouchEvents.current = false;
      }
    },

    touchstart: (e) => {
      usingTouchEvents.current = true;
      e.preventDefault();
    },

    touchmove: (e) => {
      e.preventDefault();
      // If this is a Pencil, allow moving. If it
      // is a finger, do not.
      if (e.originalEvent?.touches[0]?.force) {
        handlers.move(e);
      }
    },

    touchend: (e) => {
      handlers.click(e);
    },
    up() {
      dragTargetRef.current = null;
      setCursor(CURSOR_DEFAULT);
    },
    double: (e) => {
      if (selection?.type !== "single") return;
      e.preventDefault();

      const wrappedFeature = featureMap.get(selection.id);
      if (!wrappedFeature) {
        setSelection(USelection.none());
        return;
      }
      const feature = wrappedFeature.feature as IFeature<Polygon>;
      const newRing = feature.geometry.coordinates[0].slice();
      newRing.splice(-2, 1);
      const finalFeature = replaceCoordinates(feature, [newRing]);

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
      if (selection.type !== "single") return;
      const selected = featureMap.get(selection.id);
      if (!selected) return;

      transact({
        putFeatures: [
          {
            ...selected,
            feature: closePolygon(selected.feature as IFeature<Polygon>),
          },
        ],
        note: "Finished drawing a polygon",
      }).catch((e) => Sentry.captureException(e));
      setMode({ mode: Mode.NONE });
    },
  };

  return handlers;
}
