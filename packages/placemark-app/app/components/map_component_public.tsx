import type { PMapHandlers } from "app/lib/pmap";
import type { HandlerContext } from "types";
import { SYMBOLIZATION_NONE } from "types";
import type { FlatbushLike } from "app/lib/generate_flatbush_instance";
import React, {
  useRef,
  useEffect,
  useMemo,
  useState,
  useContext,
  MutableRefObject,
  memo,
} from "react";
import clsx from "clsx";
import throttle from "lodash/throttle";
import mapboxgl from "mapbox-gl";
import * as Sentry from "@sentry/nextjs";
import {
  ephemeralStateAtom,
  modeAtom,
  Mode,
  dataAtom,
  layerConfigAtom,
} from "state/jotai";
import { MapContext } from "app/context/map_context";
import PMap from "app/lib/pmap";
import { EmptyIndex } from "app/lib/generate_flatbush_instance";
import { CLICKABLE_LAYERS } from "app/lib/load_and_augment_style";
import { env } from "app/lib/env_client";
import { useHandlers } from "app/lib/handlers/index";
import "mapbox-gl/dist/mapbox-gl.css";
import { usePersistence } from "app/lib/persistence/context";
import { useAtomValue } from "jotai";
import { useHotkeys } from "integrations/hotkeys";
import { keybindingOptions } from "app/hooks/use_map_keybindings";
mapboxgl.accessToken = env.NEXT_PUBLIC_MAPBOX_TOKEN;

export const MapComponentPublic = memo(function MapComponent({
  setMap,
  initialExtent,
}: {
  setMap: (arg0: PMap | null) => void;
  initialExtent: BBox4;
}) {
  const data = useAtomValue(dataAtom);
  const rawLayerConfigs = useAtomValue(layerConfigAtom);
  const { featureMap, folderMap } = data;
  // State
  const [flatbushInstance, setFlatbushInstance] =
    useState<FlatbushLike>(EmptyIndex);

  const rep = usePersistence();

  // Atom state
  const selection = data.selection;
  const ephemeralState = useAtomValue(ephemeralStateAtom);
  const mode = useAtomValue(modeAtom);

  // Refs
  const mapRef: React.MutableRefObject<PMap | null> = useRef<PMap>(null);
  const mapDivRef = useRef<HTMLDivElement>(null);
  const dragTargetRef: React.MutableRefObject<RawId | null> =
    useRef<RawId>(null);
  const mapHandlers = useRef<PMapHandlers>();

  // Context
  const map = useContext(MapContext);

  // Queries
  const [meta] = rep.useMetadata();
  const { label, symbolization } = meta;

  const layerConfigs = useMemo(() => {
    return rawLayerConfigs.size
      ? rawLayerConfigs
      : meta.layer
      ? new Map([["0", meta.layer]])
      : new Map();
  }, [rawLayerConfigs, meta.layer]);

  // useMap
  //
  // Receives
  // - map & map div refs
  //
  // Emits
  // - map state
  useEffect(() => {
    // Map has already been initialized
    if (mapRef.current) return;
    if (!mapDivRef.current || !mapHandlers) return;

    // This part is not time-sensitive.
    mapRef.current = new PMap({
      element: mapDivRef.current,
      layerConfigs,
      lastPresence: initialExtent,
      handlers: mapHandlers as MutableRefObject<PMapHandlers>,
      symbolization: symbolization || SYMBOLIZATION_NONE,
      previewProperty: label,
      idMap: idMap,
      controlsCorner: "top-right",
    });

    setMap(mapRef.current);

    return () => {
      setMap(null);
      if (mapRef.current && "remove" in mapRef.current) {
        mapRef.current.remove();
      }
      mapRef.current = null;
    };
    // eslint-disable-next-line
  }, [mapRef, mapDivRef, setMap]);

  useEffect(
    function mapSetDataMethods() {
      if (!map?.map) {
        return;
      }

      // These are all, hopefully, things that we can call
      // really often without performance issues because these inputs
      // stay the same and the functions skip if they're given the same input.
      // Ordering here, though, is tricky.
      map.setData({
        data,
        ephemeralState,
      });
      map
        .setStyle({
          layerConfigs,
          symbolization: symbolization || SYMBOLIZATION_NONE,
          previewProperty: label,
        })
        .catch((e) => Sentry.captureException(e));
    },
    [map, folderMap, symbolization, data, layerConfigs, ephemeralState, label]
  );

  const throttledMovePointer = useMemo(() => {
    return function fastMovePointer(point: mapboxgl.Point) {
      if (!map) return;
      const features = map.map.queryRenderedFeatures(point, {
        layers: CLICKABLE_LAYERS,
      });
      map.map.getCanvas().style.cursor = features.length ? "pointer" : "";
    };
  }, [map]);

  const idMap = rep.idMap;

  const handlerContext: HandlerContext = {
    flatbushInstance,
    setFlatbushInstance,
    throttledMovePointer,
    mode,
    dragTargetRef,
    featureMap,
    folderMap,
    idMap,
    userId: undefined,
    selection,
    rep,
    pmap: mapRef.current!,
  };

  const HANDLERS = useHandlers(handlerContext);

  // const log = false;

  const newHandlers: PMapHandlers = {
    onClick: (e: mapboxgl.MapMouseEvent) => {
      // if (log) console.log(`${mode.mode} click`);
      HANDLERS[mode.mode].click(e);
    },
    onMapMouseDown: (e: mapboxgl.MapMouseEvent) => {
      // if (log) console.log(`${mode.mode} down`);
      HANDLERS[mode.mode].down(e);
    },
    onMapTouchStart: (e: mapboxgl.MapTouchEvent) => {
      // if (log) console.log(`${mode.mode} down`);
      const handler = HANDLERS[mode.mode];
      if (handler.touchstart) {
        handler.touchstart(e);
      } else {
        handler.down(e);
      }
    },
    onMapMouseUp: (e: mapboxgl.MapMouseEvent) => {
      // if (log) console.log(`${mode.mode} up`);
      HANDLERS[mode.mode].up(e);
    },
    onMapTouchEnd: (e: mapboxgl.MapTouchEvent) => {
      // if (log) console.log(`${mode.mode} up`);
      const handler = HANDLERS[mode.mode];
      if (handler.touchend) {
        handler.touchend(e);
      } else {
        handler.up(e);
      }
    },
    onMapTouchMove: (e: mapboxgl.MapTouchEvent) => {
      // if (log) console.log(`${mode.mode} up`);
      const handler = HANDLERS[mode.mode];
      if (handler.touchmove) {
        handler.touchmove(e);
      } else {
        handler.move(e);
      }
    },
    onMapMouseMove: (e: mapboxgl.MapMouseEvent) => {
      // if (log) console.log(`${mode.mode} move`);
      HANDLERS[mode.mode].move(e);
      const map = mapRef.current?.map;
      if (!map) return;
    },
    onDoubleClick: (e: mapboxgl.MapMouseEvent) => {
      // if (log) console.log(`${mode.mode} double`);
      HANDLERS[mode.mode].double(e);
    },
    onMoveEnd() {},
    onMove: throttle((e: mapboxgl.MapboxEvent & mapboxgl.EventData) => {
      const center = e.target.getCenter().toArray();
      const bounds = e.target.getBounds().toArray();
      return {
        center,
        bounds,
      };
    }, 300),
  };

  useHotkeys(
    "Escape, Enter",
    () => {
      HANDLERS[mode.mode].enter();
    },
    keybindingOptions,
    [HANDLERS, mode]
  );

  mapHandlers.current = newHandlers;

  return (
    <div
      className={clsx("top-0 bottom-0 left-0 right-0", {
        "placemark-cursor-default":
          mode.mode === Mode.NONE ||
          mode.mode === Mode.DRAW_POLYGON ||
          mode.mode === Mode.DRAW_LINE,
        "placemark-cursor-point": mode.mode === Mode.DRAW_POINT,
        "placemark-cursor-crosshair":
          mode.mode === Mode.DRAW_RECTANGLE || mode.mode === Mode.LASSO,
      })}
      ref={mapDivRef}
      data-testid="map"
      style={{
        position: "absolute",
      }}
    ></div>
  );
});
