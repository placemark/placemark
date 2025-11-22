import { CURSOR_DEFAULT } from "app/lib/constants";
import * as utils from "app/lib/map_component_utils";
import { usePopMoment } from "app/lib/persistence/shared";
import replaceCoordinates from "app/lib/replace_coordinates";
import { captureException } from "integrations/errors";
import { useAtomValue, useSetAtom } from "jotai";
import { useRef } from "react";
import { USelection } from "state";
import {
  cursorStyleAtom,
  Mode,
  modeAtom,
  routeTypeAtom,
  selectionAtom,
} from "state/jotai";
import type {
  GeometryCollection,
  HandlerContext,
  IFeature,
  LineString,
  Point,
} from "types";
import { createOrUpdateFeature, getMapCoord, transactRoute } from "./utils";

export function useRouteHandlers({
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
  const routeType = useAtomValue(routeTypeAtom);
  const setCursor = useSetAtom(cursorStyleAtom);
  const transact = rep.useTransact();
  const popMoment = usePopMoment();
  const usingTouchEvents = useRef<boolean>(false);

  const handlers: Handlers = {
    click: (e) => {
      if (selection.type === "none" || selection.type === "folder") {
        /**
         * Drawing a new line: create the line and set the new
         * selection
         */
        const route = utils.newRouteFromClickEvent(e);

        const putFeature = createOrUpdateFeature({
          mode,
          selection,
          featureMap,
          geometry: route,
          properties: {
            "@type": `route:${routeType}`,
          },
        });

        const id = putFeature.id;
        transact({
          note: "Started drawing a route",
          putFeatures: [putFeature],
        }).catch((e) => captureException(e));
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
        const feature = wrappedFeature.feature as IFeature<GeometryCollection>;

        const points = feature.geometry.geometries.filter(
          (g) => g.type === "Point",
        );
        const lineString = feature.geometry.geometries.find(
          (g) => g.type === "LineString",
        )!;

        const pointsWithNew = [
          ...points,
          {
            type: "Point",
            coordinates: position,
          } as Point,
        ];

        void transactRoute(
          transact,
          {
            ...wrappedFeature,
            feature: {
              ...feature,
              geometry: {
                type: "GeometryCollection",
                geometries: [lineString, ...pointsWithNew],
              },
            },
          },
          routeType,
        );
      }
    },

    move: (_e) => {
      // TODO: preview routes while moving the mouse.
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
          }),
        );
      }
      e.preventDefault();

      const feature = wrappedFeature.feature as IFeature<LineString>;
      const finalFeature = replaceCoordinates(
        feature,
        modeOptions?.reverse
          ? feature.geometry.coordinates.slice(2)
          : feature.geometry.coordinates.slice(0, -2),
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
      }).catch((e) => captureException(e));
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
                : feature.geometry.coordinates,
            ),
          },
        ],
      }).catch((e) => captureException(e));
    },
  };

  return handlers;
}
