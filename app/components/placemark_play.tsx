"use client";
import type PMap from "app/lib/pmap";
import { MapComponent } from "app/components/map_component";
import { MenuBarPlay } from "app/components/menu_bar";
import Drop from "app/components/drop";
import Modes from "app/components/modes";
import { Dialogs } from "app/components/dialogs";
import { CSS } from "@dnd-kit/utilities";
import ContextActions from "app/components/context_actions";
import * as T from "@radix-ui/react-tooltip";
import React, {
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  BottomResizer,
  Resizer,
  useBigScreen,
  useWindowResizeSplits,
} from "app/components/resizer";
import { BottomPanel, FullPanel, SidePanel } from "app/components/panels";
import { Keybindings } from "app/components/keybindings";
import { MapContext } from "app/context/map_context";
import Notifications from "app/components/notifications";
import { Legend } from "app/components/legend";
import { Visual } from "./visual";
import { FeatureEditorFolder } from "./panels/feature_editor/feature_editor_folder";
import { ErrorBoundary } from "@sentry/nextjs";
import {
  BoxModelIcon,
  LayoutIcon,
  MoveIcon,
  UpdateIcon,
  ViewHorizontalIcon,
} from "@radix-ui/react-icons";
import { Button, StyledTooltipArrow, TContent } from "./elements";
import { atom, useAtom, useAtomValue, useSetAtom } from "jotai";
import { dialogAtom, splitsAtom, tabAtom, TabOption } from "state/jotai";
import clsx from "clsx";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import debounce from "lodash/debounce";
import { useAtomCallback } from "jotai/utils";
import { useSearchParams } from "next/navigation";
import { useImportFile, useImportString } from "app/hooks/use_import";
import toast from "react-hot-toast";
import { DEFAULT_IMPORT_OPTIONS, detectType } from "app/lib/convert";
import { match } from "ts-pattern";

type ResolvedLayout = "HORIZONTAL" | "VERTICAL" | "FLOATING";

interface Transform {
  x: number;
  y: number;
}

const persistentTransformAtom = atom<Transform>({
  x: 5,
  y: 5,
});

function UrlAPI() {
  const doImportString = useImportString();
  const setDialogState = useSetAtom(dialogAtom);
  const doImportFile = useImportFile();
  const searchParams = useSearchParams();
  const load = searchParams?.get("load");
  const done = useRef<boolean>(false);

  useEffect(() => {
    if (load && !done.current) {
      done.current = true;
      (async () => {
        try {
          const url = new URL(load);
          if (url.protocol === "https:") {
            const res = await fetch(url);
            const buffer = await res.arrayBuffer();
            const file = new File(
              [buffer],
              url.pathname.split("/").pop() || "",
              {
                type: res.headers.get("Content-Type") || "",
              }
            );
            const options = (await detectType(file)).unsafeCoerce();
            doImportFile(file, options, () => {});
          } else if (url.protocol === "data:") {
            const [description, ...parts] = url.pathname.split(",");
            const data = parts.join(",");
            const [type, encoding] = description.split(";", 2) as [
              string,
              string | undefined
            ];

            let decoded = match(encoding)
              .with(undefined, () => decodeURIComponent(data))
              .with("base64", () => atob(data))
              .otherwise(() => {
                throw new Error("Unknown encoding in data url");
              });

            if (type === "application/json") {
              doImportString(
                decoded,
                {
                  ...DEFAULT_IMPORT_OPTIONS,
                  type: "geojson",
                },
                (...args) => {
                  // eslint-disable-next-line no-console
                  console.log(args);
                }
              );
            } else {
              setDialogState({
                type: "load_text",
                initialValue: decoded,
              });
            }
          } else {
            toast.error(
              "Couldn’t handle this ?load argument - urls and data urls are supported"
            );
          }
        } catch (e) {
          toast.error(
            e instanceof Error ? e.message : "Failed to load data from URL"
          );
        }
      })();
    }
  }, [load, doImportString, doImportFile]);

  return null;
}

export function PlacemarkPlay() {
  const [map, setMap] = useState<PMap | null>(null);
  useWindowResizeSplits();
  const splits = useAtomValue(splitsAtom);
  const isBigScreen = useBigScreen();

  let layout: ResolvedLayout = "HORIZONTAL";

  switch (splits.layout) {
    case "VERTICAL":
      layout = "VERTICAL";
      break;
    case "AUTO":
      layout = isBigScreen ? "HORIZONTAL" : "VERTICAL";
      break;
    case "FLOATING": {
      layout = "FLOATING";
      break;
    }
  }

  const sensor = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 2,
      },
    })
  );

  const [persistentTransform, setPersistentTransform] = useAtom(
    persistentTransformAtom
  );

  return (
    <main className="h-screen flex flex-col bg-white dark:bg-gray-800">
      <MapContext.Provider value={map}>
        <ErrorBoundary
          fallback={(props) => {
            return (
              <div className="h-20 flex items-center justify-center px-2 gap-x-2">
                An error occurred
                <Button onClick={() => props.resetError()}>
                  <UpdateIcon /> Try again
                </Button>
              </div>
            );
          }}
        >
          <div className="h-24">
            <MenuBarPlay />
            <div
              className="flex flex-row items-center justify-start overflow-x-auto sm:overflow-visible
          border-t border-gray-200 dark:border-gray-900 pl-2 h-12"
            >
              <Modes replaceGeometryForId={null} />
              <div className="flex-auto" />
              <ContextActions />
              <div className="flex-auto" />
              <div className="flex items-center space-x-2">
                <Visual />
              </div>
            </div>
          </div>
        </ErrorBoundary>
        <div
          className={clsx(
            layout === "VERTICAL" && "flex-col",
            "flex flex-auto relative border-t border-gray-200 dark:border-gray-900"
          )}
        >
          {layout === "HORIZONTAL" ? (
            <FeatureEditorFolder />
          ) : layout === "FLOATING" ? (
            <FullPanel />
          ) : null}
          <DndContext
            sensors={sensor}
            modifiers={[restrictToWindowEdges]}
            onDragEnd={(end) => {
              setPersistentTransform((transform) => {
                return {
                  x: transform.x + end.delta.x,
                  y: transform.y + end.delta.y,
                };
              });
            }}
          >
            <DraggableMap
              persistentTransform={persistentTransform}
              setMap={setMap}
              layout={layout}
            />
          </DndContext>
          {layout === "HORIZONTAL" ? (
            <>
              <SidePanel />
              <Resizer side="left" />
              <Resizer side="right" />
            </>
          ) : layout === "VERTICAL" ? (
            <>
              <BottomPanel />
              <BottomResizer />
            </>
          ) : null}
        </div>
        <Drop />
        <UrlAPI />
        <Dialogs />
        <Suspense fallback={null}>
          <Keybindings />
        </Suspense>
        <Notifications />
      </MapContext.Provider>
    </main>
  );
}

function DraggableMap({
  setMap,
  layout,
  persistentTransform,
}: {
  setMap: (arg0: PMap | null) => void;
  layout: ResolvedLayout;
  persistentTransform: Transform;
}) {
  const [splits, setSplits] = useAtom(splitsAtom);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: "map",
  });

  useMapResize(containerRef.current, layout);

  const SELECTED = "bg-gray-100 dark:bg-gray-700 dark:text-gray-100";
  const UNSELECTED =
    "dark:bg-black text-gray-300 dark:text-gray-500 hover:text-gray-400";

  const switchToFloating = useAtomCallback(
    useCallback((get, set) => {
      set(splitsAtom, {
        ...get(splitsAtom),
        layout: "FLOATING",
      });

      set(tabAtom, TabOption.Table);

      // Size - this is w-64
      const SIZE = 256;
      // Distance from screen edge
      const MARGIN = 32;
      // Height of the double header
      const HEADER_HEIGHT = 48 * 2;
      const transform: Transform = {
        x: window.innerWidth - SIZE - MARGIN,
        y: window.innerHeight - SIZE - MARGIN - HEADER_HEIGHT,
      };

      /**
       * Push UI to bottom right
       */
      set(persistentTransformAtom, transform);
    }, [])
  );

  return (
    <div
      className={clsx(
        layout === "FLOATING"
          ? "overflow-hidden absolute w-64 h-64 flex z-50 rounded border border-gray-500 shadow-lg"
          : "relative flex-auto flex flex-col"
      )}
      ref={(elem) => {
        setNodeRef(elem);
        containerRef.current = elem;
      }}
      style={
        layout === "FLOATING"
          ? {
              resize: "both",
              transform: CSS.Transform.toString(transform),
              top: persistentTransform.y,
              left: persistentTransform.x,
            }
          : {}
      }
    >
      <div className="flex-auto relative">
        <MapComponent setMap={setMap} />
      </div>
      {layout === "FLOATING" ? null : <Legend />}
      <div
        className="top-2 right-2 absolute
      flex items-center justify-between
      divide-x divide-gray-300 dark:divide-black
      rounded-md border border-gray-300 dark:border-black"
      >
        <T.Root delayDuration={0}>
          <T.Trigger asChild>
            <button
              className={clsx(
                "block p-2 bg-white rounded-l",
                splits.layout === "AUTO" ? SELECTED : UNSELECTED
              )}
              onClick={() => {
                setSplits((splits) => {
                  return {
                    ...splits,
                    layout: "AUTO",
                  };
                });
              }}
            >
              <LayoutIcon />
            </button>
          </T.Trigger>
          <TContent>
            <StyledTooltipArrow />
            Horizontal layout
          </TContent>
        </T.Root>

        <T.Root delayDuration={0}>
          <T.Trigger asChild>
            <button
              className={clsx(
                "block p-2 bg-white",
                splits.layout === "FLOATING" ? SELECTED : UNSELECTED
              )}
              onClick={() => {
                switchToFloating();
              }}
            >
              <BoxModelIcon />
            </button>
          </T.Trigger>
          <TContent>
            <StyledTooltipArrow />
            Floating map layout
          </TContent>
        </T.Root>
        <T.Root delayDuration={0}>
          <T.Trigger asChild>
            <button
              className={clsx(
                "block p-2 bg-white rounded-r",
                splits.layout === "VERTICAL" ? SELECTED : UNSELECTED
              )}
              onClick={() => {
                setSplits((splits) => {
                  return {
                    ...splits,
                    layout: "VERTICAL",
                  };
                });
              }}
            >
              <ViewHorizontalIcon />
            </button>
          </T.Trigger>
          <TContent>
            <StyledTooltipArrow />
            Vertical layout
          </TContent>
        </T.Root>
      </div>
      {layout === "FLOATING" ? (
        <button
          className="absolute top-2 left-2 block p-2
        border border-gray-300 dark:border-black
        bg-white dark:bg-gray-700
        dark:text-white
        rounded
        touch-none
        cursor-move"
          {...listeners}
          {...attributes}
        >
          <MoveIcon />
        </button>
      ) : null}
    </div>
  );
}

function useMapResize(element: HTMLElement | null, layout: ResolvedLayout) {
  const pmap = useContext(MapContext);

  useLayoutEffect(() => {
    if (element) {
      element.style.width = "";
      element.style.height = "";
    }
    pmap?.map?.resize();
  }, [element, pmap, layout]);

  useLayoutEffect(() => {
    if (element) {
      const callback = debounce((entries: ResizeObserverEntry[]) => {
        if (!Array.isArray(entries)) {
          return;
        }

        if (!entries.length) {
          return;
        }

        pmap?.map?.resize();
      }, 50);

      const resizeObserver = new ResizeObserver(callback);
      resizeObserver.observe(element, { box: "border-box" });
      return () => resizeObserver.unobserve(element);
    } else {
      // Nothing
    }
  }, [element, pmap, layout]);
}
