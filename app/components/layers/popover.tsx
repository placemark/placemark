import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  restrictToFirstScrollableAncestor,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CaretLeftIcon,
  CaretRightIcon,
  DragHandleDots2Icon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  Pencil1Icon,
  PlusIcon,
  RotateCounterClockwiseIcon,
  TrashIcon,
} from "@radix-ui/react-icons";
import { useQuery } from "@tanstack/react-query";
import * as E from "app/components/elements";
import { TextWell } from "app/components/elements";
import { MapContext } from "app/context/map_context";
import { FORM_ERROR, Form } from "app/core/components/Form";
import { LabeledTextField } from "app/core/components/LabeledTextField";
import LAYERS from "app/lib/default_layers";
import { newFeatureId } from "app/lib/id";
import { usePersistence } from "app/lib/persistence/context";
import type { Moment } from "app/lib/persistence/moment";
import { get, getTileJSON } from "app/lib/utils";
import { zTileJSON } from "app/mapbox-layers/validations";
import { generateKeyBetween } from "fractional-indexing";
import { captureException } from "integrations/errors";
import { atom, useAtom, useAtomValue, useSetAtom } from "jotai";
import clamp from "lodash/clamp";
import groupBy from "lodash/groupBy";
import { Popover as P, Tooltip as T } from "radix-ui";
import { Fragment, Suspense, useContext, useState } from "react";
import toast from "react-hot-toast";
import { layerConfigAtom } from "state/jotai";
import { match } from "ts-pattern";
import { type ILayerConfig, zLayerConfig } from "types";
import { ZodError, z } from "zod";
import { DefaultLayerItem } from "./default_layer_item";

type Mode =
  | "initial"
  | "custom"
  | "custom-allmaps"
  | "custom-xyz"
  | "custom-style"
  | "custom-tilejson";

const layerModeAtom = atom<Mode>("initial");

const SHARED_INTIAL_VALUES = {
  at: "a0",
  id: "",
  name: "",
  url: "",
  token: "",
  visibility: true,
  labelVisibility: true,
  tms: false,
  opacity: 1,
} as const;

/**
 * Layers with lower ats stack on top,
 * so this finds the lowest at possible.
 */
function getNextAt(items: ILayerConfig[]) {
  if (!items.length) {
    return generateKeyBetween(null, null);
  }
  return generateKeyBetween(null, items[0].at || null);
}

function maybeDeleteOldBaseStyle(items: ILayerConfig[]): {
  deleteLayerConfigs: Moment["deleteLayerConfigs"];
  oldAt: string | undefined;
} {
  let oldAt: string | undefined;
  const oldBaseStyle = items.find((layer) => layer.type === "STYLE");

  const deleteLayerConfigs: string[] = [];

  if (oldBaseStyle) {
    oldAt = oldBaseStyle.at;
    deleteLayerConfigs.push(oldBaseStyle.id);
  }
  return {
    oldAt,
    deleteLayerConfigs,
  };
}

const StyleSkeleton = z.object({
  version: z.literal(8),
  name: z.string().optional(),
});

const AllmapsAnnotationSkeleton = z.union([
  z.object({ type: z.literal("Annotation") }),
  z.object({ type: z.literal("AnnotationPage") }),
]);

function BackButton({ to }: { to: Mode }) {
  const setMode = useSetAtom(layerModeAtom);
  return (
    <E.Button
      type="button"
      size="xs"
      onClick={() => {
        setMode(to);
      }}
    >
      <CaretLeftIcon />
      Back
    </E.Button>
  );
}

function LayerFormHeader({
  isEditing,
  children,
}: React.PropsWithChildren<{
  isEditing?: boolean;
}>) {
  return (
    <div className="flex justify-between items-center pb-2">
      <div className="font-bold">{children}</div>
      {isEditing ? (
        <P.Close asChild>
          <E.Button type="button" size="xs">
            Cancel
          </E.Button>
        </P.Close>
      ) : (
        <BackButton to="custom" />
      )}
    </div>
  );
}

function MapLibreStyleLayer({
  layer,
  onDone,
}: {
  layer?: z.infer<typeof zLayerConfig>;
  onDone?: () => void;
}) {
  const setMode = useSetAtom(layerModeAtom);
  const rep = usePersistence();
  const transact = rep.useTransact();
  const isEditing = !!layer;
  const layerConfigs = useAtomValue(layerConfigAtom);
  const items = [...layerConfigs.values()];

  const initialValues =
    layer ||
    ({
      ...SHARED_INTIAL_VALUES,
      type: "STYLE",
    } as const);

  return (
    <Form
      schema={zLayerConfig}
      initialValues={initialValues}
      submitText={isEditing ? "Update style" : "Add style"}
      fullWidthSubmit
      onSubmit={async (values) => {
        if (values.type !== "STYLE") {
          return { [FORM_ERROR]: "Expected a MapLibre style" };
        }
        let name = "MapLibre style";
        try {
          const style = await get(values.url, StyleSkeleton);
          name = style.name || name;
        } catch (_e) {
          return {
            [FORM_ERROR]: "Could not load a valid MapLibre style",
          };
        }

        const { deleteLayerConfigs, oldAt } = maybeDeleteOldBaseStyle(items);
        if (deleteLayerConfigs.length) {
          toast("Base style replaced");
        }
        await transact({
          note: "Add MapLibre style",
          deleteLayerConfigs,
          putLayerConfigs: [
            {
              ...values,
              name,
              visibility: true,
              labelVisibility: true,
              tms: false,
              opacity: 1,
              at: oldAt || getNextAt(items),
              id: values.id || newFeatureId(),
            },
          ],
        });

        setMode("initial");
        onDone?.();
      }}
    >
      <LayerFormHeader isEditing={isEditing}>MapLibre style</LayerFormHeader>
      <TextWell variant="primary" size="xs">
        Enter an HTTPS URL for a MapLibre style. OpenFreeMap styles do not
        require a token.
      </TextWell>
      <LabeledTextField
        name="url"
        label="Style URL"
        required
        type="url"
        autoComplete="off"
        placeholder="https://tiles.openfreemap.org/styles/positron"
      />
    </Form>
  );
}

function TileJSONLayer({
  layer,
  onDone,
}: {
  layer?: z.infer<typeof zLayerConfig>;
  onDone?: () => void;
}) {
  const setMode = useSetAtom(layerModeAtom);
  const rep = usePersistence();
  const transact = rep.useTransact();
  const isEditing = !!layer;
  const layerConfigs = useAtomValue(layerConfigAtom);
  const items = [...layerConfigs.values()];

  const initialValues =
    layer ||
    ({
      ...SHARED_INTIAL_VALUES,
      type: "TILEJSON",
    } as const);

  return (
    <Form
      schema={zLayerConfig}
      initialValues={initialValues}
      submitText={isEditing ? "Update layer" : "Add layer"}
      fullWidthSubmit
      onSubmit={async (values) => {
        try {
          await get(values.url, zTileJSON);
        } catch (e) {
          if (e instanceof ZodError) {
            return {
              [FORM_ERROR]:
                "Invalid response: this endpoint does not produce valid TileJSON.",
            };
          }
          return {
            [FORM_ERROR]: "Invalid: this TileJSON can’t be downloaded.",
          };
        }
        await transact({
          putLayerConfigs: [
            {
              ...values,
              at: layer?.at || getNextAt(items),
              id: values.id || newFeatureId(),
            },
          ],
        });

        setMode("initial");
        if (onDone) {
          onDone();
        }
      }}
    >
      <LayerFormHeader isEditing={isEditing}>TileJSON</LayerFormHeader>
      <TextWell variant="primary" size="xs">
        Raster tiles are supported with{" "}
        <a
          target="_blank"
          rel="noreferrer"
          className={E.styledInlineA}
          href="https://github.com/mapbox/tilejson-spec"
        >
          TileJSON
        </a>
        .
      </TextWell>

      <LabeledTextField
        name="name"
        label="Name"
        required
        autoComplete="off"
        placeholder=""
      />
      <LabeledTextField
        name="url"
        required
        label="TileJSON URL"
        autoComplete="off"
        placeholder="https://…"
      />
    </Form>
  );
}

function AllmapsLayer({
  layer,
  onDone,
}: {
  layer?: z.infer<typeof zLayerConfig>;
  onDone?: () => void;
}) {
  const setMode = useSetAtom(layerModeAtom);
  const rep = usePersistence();
  const transact = rep.useTransact();
  const isEditing = !!layer;
  const layerConfigs = useAtomValue(layerConfigAtom);
  const items = [...layerConfigs.values()];

  const initialValues =
    layer ||
    ({
      ...SHARED_INTIAL_VALUES,
      saturation: 1,
      type: "ALLMAPS",
    } as const);

  return (
    <Form
      schema={zLayerConfig}
      initialValues={initialValues}
      submitText={isEditing ? "Update layer" : "Add layer"}
      fullWidthSubmit
      onSubmit={async (values) => {
        if (values.type !== "ALLMAPS") {
          return { [FORM_ERROR]: "Expected an Allmaps layer" };
        }
        try {
          await get(values.url, AllmapsAnnotationSkeleton);
        } catch (e) {
          if (e instanceof ZodError) {
            return {
              [FORM_ERROR]:
                "Invalid response: this endpoint does not produce an Allmaps annotation.",
            };
          }
          return {
            [FORM_ERROR]:
              "Invalid: this Allmaps annotation can’t be downloaded.",
          };
        }
        await toast.promise(
          transact({
            note: isEditing ? "Update Allmaps layer" : "Add Allmaps layer",
            putLayerConfigs: [
              {
                ...values,
                at: layer?.at || getNextAt(items),
                id: values.id || newFeatureId(),
              },
            ],
          }),
          {
            loading: isEditing ? "Updating layer" : "Adding layer",
            success: isEditing ? "Updated layer" : "Added layer",
            error: "Error",
          },
        );

        setMode("initial");
        onDone?.();
        return undefined;
      }}
    >
      <LayerFormHeader isEditing={isEditing}>Allmaps</LayerFormHeader>
      <TextWell variant="primary" size="xs">
        Displays georeferenced{" "}
        <a
          target="_blank"
          rel="noreferrer"
          className={E.styledInlineA}
          href="https://iiif.io/"
        >
          IIIF
        </a>{" "}
        maps from a{" "}
        <a
          target="_blank"
          rel="noreferrer"
          className={E.styledInlineA}
          href="https://iiif.io/api/extension/georef/"
        >
          Georeference Annotation
        </a>{" "}
        using{" "}
        <a
          target="_blank"
          rel="noreferrer"
          className={E.styledInlineA}
          href="https://allmaps.org/"
        >
          Allmaps
        </a>
      </TextWell>
      <LabeledTextField
        name="name"
        label="Name"
        required
        autoComplete="off"
        placeholder=""
      />
      <LabeledTextField
        name="url"
        label="Annotation URL"
        required
        type="url"
        autoComplete="off"
        placeholder="https://annotations.allmaps.org/images/d180902cb93d5bf2"
      />
    </Form>
  );
}

function XYZLayer({
  layer,
  onDone,
}: {
  layer?: z.infer<typeof zLayerConfig>;
  onDone?: () => void;
}) {
  const setMode = useSetAtom(layerModeAtom);
  const rep = usePersistence();
  const transact = rep.useTransact();
  const layerConfigs = useAtomValue(layerConfigAtom);
  const items = [...layerConfigs.values()];
  const isEditing = !!layer;

  const initialValues =
    layer ||
    ({
      ...SHARED_INTIAL_VALUES,
      type: "XYZ",
    } as const);

  return (
    <Form
      schema={zLayerConfig}
      initialValues={initialValues}
      submitText={isEditing ? "Update layer" : "Add layer"}
      fullWidthSubmit
      onSubmit={async (values) => {
        await toast.promise(
          transact({
            putLayerConfigs: [
              {
                ...values,
                at: layer?.at || getNextAt(items),
                id: values.id || newFeatureId(),
              },
            ],
          }),
          {
            loading: isEditing ? "Updating layer" : "Adding layer",
            success: isEditing ? "Updated layer" : "Added layer",
            error: "Error",
          },
        );
        setMode("initial");
        if (onDone) {
          onDone();
        }
        return undefined;
      }}
    >
      <LayerFormHeader isEditing={isEditing}>XYZ</LayerFormHeader>

      <TextWell variant="primary" size="xs">
        Supports image{" "}
        <a
          target="_blank"
          rel="noreferrer"
          className={E.styledInlineA}
          href="https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames"
        >
          slippy map tiles
        </a>
        .
      </TextWell>

      <LabeledTextField
        name="name"
        label="Name"
        autoComplete="off"
        required
        placeholder=""
      />
      <LabeledTextField
        name="url"
        label="Template URL"
        autoComplete="off"
        required
        type="url"
        placeholder="https://…"
      />
      <TextWell>
        Template URLs should contain {"{z}"}, {"{x}"}, and {"{y}"}.
      </TextWell>
      <label className="flex items-center gap-x-2 text-sm py-2">
        <E.FieldCheckbox name="tms" type="checkbox" /> TMS
      </label>
    </Form>
  );
}

/**
 * Switch between layer editors given a layer
 * config object.
 */
function AnyLayer({
  layer,
  ...rest
}: {
  layer: ILayerConfig;
  onDone: () => void;
}) {
  return match(layer)
    .with({ type: "ALLMAPS" }, (layer) => (
      <AllmapsLayer layer={layer} {...rest} />
    ))
    .with({ type: "XYZ" }, (layer) => <XYZLayer layer={layer} {...rest} />)
    .with({ type: "TILEJSON" }, (layer) => (
      <TileJSONLayer layer={layer} {...rest} />
    ))
    .with({ type: "STYLE" }, (layer) => (
      <MapLibreStyleLayer layer={layer} {...rest} />
    ))
    .exhaustive();
}

function AddLayer() {
  const rep = usePersistence();
  const transact = rep.useTransact();
  const [isOpen, setOpen] = useState<boolean>(false);
  const [mode, setMode] = useAtom(layerModeAtom);
  const layerConfigs = useAtomValue(layerConfigAtom);
  const items = [...layerConfigs.values()];
  const nextAt = getNextAt(items);

  const defaultLayerList = (
    <div className="py-2">
      {Object.entries(
        groupBy(Object.entries(LAYERS), ([_id, layer]) => layer.provider),
      ).map(([provider, layers]) => (
        <Fragment key={provider}>
          <E.DivLabel>{provider}</E.DivLabel>
          {layers.map(([id, baseLayer]) => (
            <DefaultLayerItem
              key={id}
              layer={baseLayer}
              onSelect={async (layer) => {
                const { deleteLayerConfigs, oldAt } =
                  maybeDeleteOldBaseStyle(items);
                if (deleteLayerConfigs.length) {
                  toast("Base style replaced");
                }
                await transact({
                  note: "Add layer",
                  deleteLayerConfigs,
                  putLayerConfigs: [
                    {
                      ...layer,
                      visibility: true,
                      tms: false,
                      opacity: 1,
                      at: oldAt || nextAt,
                      id: newFeatureId(),
                      labelVisibility: true,
                    },
                  ],
                });
              }}
            />
          ))}
        </Fragment>
      ))}
      <E.DivSeparator />
      <button
        type="button"
        className={`w-full block ${E.menuItemLike({ variant: "default" })}`}
        onClick={() => {
          setMode("custom");
        }}
        value="manage"
      >
        <PlusIcon /> Custom
      </button>
    </div>
  );

  return (
    <P.Root
      open={isOpen}
      onOpenChange={(val) => {
        setOpen(val);
        setMode("initial");
      }}
    >
      <P.Trigger asChild>
        <E.Button aria-label="Add layer">
          <PlusIcon />
        </E.Button>
      </P.Trigger>

      <P.Portal>
        <E.StyledPopoverContent
          flush="yes"
          size="sm"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <E.StyledPopoverArrow />
          <Suspense fallback={<E.Loading />}>
            {match(mode)
              .with("initial", () => defaultLayerList)
              .with("custom", () => (
                <div className="p-3">
                  <div className="flex justify-between items-center pb-3">
                    <div className="font-bold">Choose type</div>
                    <BackButton to="initial" />
                  </div>
                  <div className="space-y-2 grid grid-cols-1">
                    <E.Button onClick={() => setMode("custom-allmaps")}>
                      Allmaps
                      <CaretRightIcon />
                    </E.Button>
                    <E.Button onClick={() => setMode("custom-xyz")}>
                      XYZ
                      <CaretRightIcon />
                    </E.Button>
                    <E.Button onClick={() => setMode("custom-style")}>
                      MapLibre style
                      <CaretRightIcon />
                    </E.Button>
                    <E.Button onClick={() => setMode("custom-tilejson")}>
                      TileJSON
                      <CaretRightIcon />
                    </E.Button>
                  </div>
                </div>
              ))
              .with("custom-xyz", () => (
                <div className="p-3">
                  <XYZLayer onDone={() => setOpen(false)} />
                </div>
              ))
              .with("custom-allmaps", () => (
                <div className="p-3">
                  <AllmapsLayer onDone={() => setOpen(false)} />
                </div>
              ))
              .with("custom-style", () => (
                <div className="p-3">
                  <MapLibreStyleLayer onDone={() => setOpen(false)} />
                </div>
              ))
              .with("custom-tilejson", () => (
                <div className="p-3">
                  <TileJSONLayer onDone={() => setOpen(false)} />
                </div>
              ))
              .exhaustive()}
          </Suspense>
        </E.StyledPopoverContent>
      </P.Portal>
    </P.Root>
  );
}

function SortableLayerConfig({ layerConfig }: { layerConfig: ILayerConfig }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: layerConfig.id });
  const pmap = useContext(MapContext);
  const rep = usePersistence();
  const transact = rep.useTransact();
  const [editing, setEditing] = useState<boolean>(false);

  const { data: tilejson, isError } = useQuery({
    queryKey: ["tilejson", layerConfig.url],
    queryFn: async () => getTileJSON(layerConfig.url),
    enabled: layerConfig.type === "TILEJSON",
    retry: false,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const editPopover = (
    <P.Root open={editing} onOpenChange={(val) => setEditing(val)}>
      <P.Trigger asChild>
        <button
          type="button"
          className={"opacity-30 hover:opacity-100 select-none"}
          title="Edit"
        >
          <Pencil1Icon />
        </button>
      </P.Trigger>
      <E.StyledPopoverContent>
        <E.StyledPopoverArrow />
        <AnyLayer layer={layerConfig} onDone={() => setEditing(false)} />
      </E.StyledPopoverContent>
    </P.Root>
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="py-1 group flex gap-x-1 items-start"
      key={layerConfig.id}
    >
      <div
        className="pt-0.5 opacity-20 hover:opacity-100 cursor-ns-resize"
        {...attributes}
        {...listeners}
      >
        <DragHandleDots2Icon />
      </div>
      <div className="flex-auto">
        <div className="flex gap-x-2 items-center">
          <span
            {...attributes}
            {...listeners}
            className="block select-none truncate flex-auto text-sm"
          >
            {layerConfig.name}
          </span>
          {isError ? (
            <T.Root delayDuration={0}>
              <T.Trigger>
                <ExclamationTriangleIcon className="text-red-500 dark:text-red-300" />
              </T.Trigger>
              <E.TContent>This TileJSON source failed to load</E.TContent>
            </T.Root>
          ) : null}
          {/** biome-ignore lint/complexity/useOptionalChain: nope */}
          {tilejson && tilejson?.bounds ? (
            <button
              type="button"
              title="Zoom to layer"
              className={"opacity-30 hover:opacity-100 select-none"}
              onClick={() => {
                if (!pmap?.flyToBounds(tilejson.bounds!)) {
                  toast.error("TileJSON bounds are not ready");
                }
              }}
            >
              <MagnifyingGlassIcon />
            </button>
          ) : null}
          {layerConfig.type === "ALLMAPS" ? (
            <>
              <button
                type="button"
                title="Zoom to layer"
                className={"opacity-30 hover:opacity-100 select-none"}
                onClick={() => {
                  if (!pmap?.zoomToAllmapsLayer(layerConfig.id)) {
                    toast.error("Allmaps layer bounds are not ready");
                  }
                }}
              >
                <MagnifyingGlassIcon />
              </button>
              <button
                type="button"
                title="Zoom and rotate to layer"
                className={"opacity-30 hover:opacity-100 select-none"}
                onClick={() => {
                  if (!pmap?.zoomToAllmapsLayerWithBearing(layerConfig.id)) {
                    toast.error("Allmaps layer bearing is not ready");
                  }
                }}
              >
                <RotateCounterClockwiseIcon />
              </button>
            </>
          ) : null}
          {editPopover}
          <div className="flex items-center gap-x-1">
            <input
              type="number"
              min="0"
              step="1"
              className="text-xs
          px-1 py-0.5
          border-gray-300
          rounded-xs
          dark:text-white
          dark:bg-transparent
        opacity-50 hover:opacity-100 focus:opacity-100
        w-12"
              max="100"
              value={Math.round(layerConfig.opacity * 100)}
              onChange={async (e) => {
                const opacity = clamp(e.target.valueAsNumber / 100, 0, 1);
                if (Number.isNaN(opacity)) return;
                await transact({
                  note: "Change layer opacity",
                  putLayerConfigs: [
                    {
                      ...layerConfig,
                      opacity,
                    },
                  ],
                });
              }}
            />
            <div className="text-gray-500 text-xs">%</div>
          </div>
          <div
            role="checkbox"
            title="Toggle visibility"
            onClick={async () => {
              await transact({
                note: "Toggle background layer visibility",
                putLayerConfigs: [
                  {
                    ...layerConfig,
                    visibility: !layerConfig.visibility,
                  },
                ],
              });
            }}
            aria-checked={layerConfig.visibility}
            className={"opacity-30 hover:opacity-100 select-none"}
          >
            <E.VisibilityToggleIcon visibility={layerConfig.visibility} />
          </div>
          <div
            role="checkbox"
            title={
              layerConfig.type === "ALLMAPS"
                ? "Toggle saturation"
                : "Toggle label visibility"
            }
            onClick={async () => {
              if (layerConfig.type === "ALLMAPS") {
                await transact({
                  note: "Toggle layer saturation",
                  putLayerConfigs: [
                    {
                      ...layerConfig,
                      saturation: (layerConfig.saturation ?? 1) > 0 ? 0 : 1,
                    },
                  ],
                });
                return;
              }

              await transact({
                note: "Toggle label visibility",
                putLayerConfigs: [
                  {
                    ...layerConfig,
                    labelVisibility: !layerConfig.labelVisibility,
                  },
                ],
              });
            }}
            aria-checked={
              layerConfig.type === "ALLMAPS"
                ? (layerConfig.saturation ?? 1) > 0
                : layerConfig.labelVisibility
            }
            className={"opacity-30 hover:opacity-100 select-none"}
          >
            {layerConfig.type === "ALLMAPS" ? (
              <E.SaturationToggleIcon
                saturation={layerConfig.saturation ?? 1}
              />
            ) : (
              <E.LabelToggleIcon visibility={layerConfig.labelVisibility} />
            )}
          </div>

          <button
            type="button"
            className={"opacity-30 hover:opacity-100 select-none"}
            onClick={async () => {
              await transact({
                note: "Delete layer",
                deleteLayerConfigs: [layerConfig.id],
              });
            }}
          >
            <TrashIcon />
          </button>
        </div>
        <div
          className="opacity-50 font-semibold"
          style={{
            fontSize: 10,
          }}
        >
          {layerConfig.type}
        </div>
      </div>
    </div>
  );
}

export function LayersPopover() {
  const rep = usePersistence();
  const transact = rep.useTransact();
  const layerConfigs = useAtomValue(layerConfigAtom);
  const items = [...layerConfigs.values()];

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over?.id);
      const ordered = arrayMove(items, oldIndex, newIndex);
      const idx = ordered.findIndex((item) => item.id === active.id);
      const layerConfig = ordered[idx];
      let at = "a0";
      try {
        at = generateKeyBetween(
          ordered[idx - 1]?.at || null,
          ordered[idx + 1]?.at || null,
        );
      } catch (_e) {}

      transact({
        note: "Reorder layers",
        putLayerConfigs: [
          {
            ...layerConfig,
            at,
          },
        ],
      }).catch((e) => captureException(e));
    }
  }

  return (
    <div>
      <div className="flex justify-between pb-2">
        <div className="font-bold">Layers</div>
        <div className="relative">
          <AddLayer />
        </div>
      </div>
      <div
        className="placemark-scrollbar overflow-y-auto"
        style={{
          maxHeight: 300,
        }}
      >
        <DndContext
          onDragEnd={handleDragEnd}
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[
            restrictToVerticalAxis,
            restrictToFirstScrollableAncestor,
          ]}
        >
          <div
            className="pt-3 border-t
            border-gray-100 dark:border-gray-700"
          >
            <SortableContext
              items={items}
              strategy={verticalListSortingStrategy}
            >
              {items.map((layerConfig) => {
                return (
                  <SortableLayerConfig
                    layerConfig={layerConfig}
                    key={layerConfig.id}
                  />
                );
              })}
            </SortableContext>
          </div>
        </DndContext>
      </div>
    </div>
  );
}
