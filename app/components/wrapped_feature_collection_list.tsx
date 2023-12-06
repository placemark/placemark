import { invalidateQuery, useMutation, useQuery } from "@blitzjs/rpc";
import {
  FeatureCollectionRowDisplay,
  FolderRowDisplay,
} from "app/components/feature_collection/row_display";
import { useState } from "react";
import getWrappedFeatureCollectionTree, {
  TreeFolder,
  TreeWfc,
} from "app/wrappedFeatureCollections/queries/getWrappedFeatureCollectionTree";
import { MultiCollectionActions } from "app/components/feature_collection/multi_collection_actions";
import * as Sentry from "@sentry/nextjs";
import * as ToggleGroup from "@radix-ui/react-toggle-group";
import { toggle } from "app/lib/utils";
import {
  CaretRightIcon,
  MagnifyingGlassIcon,
  PinLeftIcon,
  ViewGridIcon,
  ViewHorizontalIcon,
} from "@radix-ui/react-icons";
import { Button, styledInlineA } from "./elements";
import { CreateMap } from "app/components/create_map";
import { useUpdateUser } from "app/hooks/update_user";
import { useAtom, useSetAtom } from "jotai";
import { dialogAtom, listModeAtom, showFolderTreeAtom } from "state/jotai";
import { Routes } from "@blitzjs/next";
import Link from "next/link";
import clsx from "clsx";
import { useParent } from "app/hooks/use_parent";
import {
  DndContext,
  PointerSensor,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { ContainerNode, pullNode, RootNode } from "app/lib/tree";
import editWrappedFeatureCollectionFolderMutation from "app/wrappedFeatureCollectionFolders/mutations/editWrappedFeatureCollectionFolder";
import editWrappedFeatureCollectionMutation from "app/wrappedFeatureCollections/mutations/editWrappedFeatureCollection";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import {
  WrappedFeatureCollection,
  WrappedFeatureCollectionFolder,
} from "@prisma/client";
import { FolderDetails } from "app/components/icons";

const BREADCRUMB_CLASSES =
  "flex gap-x-2 items-center py-0.5 px-2 hover:underline";

const BREADCRUMB_OVER_CLASSES =
  "dark:bg-purple-500 bg-purple-100 ring-1 ring-purple-300 rounded rounded-full pointer-events-none";

function EmptyState() {
  return (
    <div className="py-10 text-center col-span-4">
      <CreateMap mini />
      <div className="pt-8 text-sm">
        Check out{" "}
        <a
          className={styledInlineA}
          rel="noreferrer"
          target="_blank"
          href="https://www.placemark.io/documentation-index"
        >
          documentation
        </a>{" "}
        and{" "}
        <a
          className={styledInlineA}
          rel="noreferrer"
          target="_blank"
          href="https://www.placemark.io/videos"
        >
          videos
        </a>
        .
      </div>
    </div>
  );
}

function Breadcrumbs({
  path,
  parent,
}: {
  path: ContainerNode<TreeFolder, TreeWfc>[] | null | undefined;
  parent: string | null;
}) {
  if (!path?.length) return null;

  return (
    <div className="flex items-center text-sm border border-gray-200 dark:border-gray-700 rounded-md">
      {path.length ? <BreadcrumbHome /> : null}
      {path.map((breadcrumb) => {
        return (
          <Breadcrumb
            breadcrumb={breadcrumb.data}
            key={breadcrumb.data.id}
            parent={parent}
          />
        );
      })}
    </div>
  );
}

function BreadcrumbHome({}) {
  const { isOver, setNodeRef } = useDroppable({
    id: "",
    data: { id: null },
  });
  return (
    <Link
      href={Routes.PlacemarkIndex({})}
      ref={setNodeRef}
      className={clsx(BREADCRUMB_CLASSES, isOver && BREADCRUMB_OVER_CLASSES)}
    >
      Home
    </Link>
  );
}

function Breadcrumb({
  breadcrumb,
  parent,
}: {
  breadcrumb: TreeFolder;
  parent: string | null;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: breadcrumb.id,
    data: breadcrumb,
  });
  return (
    <>
      <CaretRightIcon />
      <Link
        href={Routes.PlacemarkIndex({ parent: breadcrumb.id })}
        ref={setNodeRef}
        className={clsx(
          BREADCRUMB_CLASSES,
          isOver && BREADCRUMB_OVER_CLASSES,
          breadcrumb.id === parent && "font-semibold"
        )}
      >
        {breadcrumb.name}
      </Link>
    </>
  );
}

function FolderTree({
  tree,
  parent,
  level = 0,
}: {
  tree: RootNode<TreeFolder, TreeWfc> | ContainerNode<TreeFolder, TreeWfc>;
  parent: string | null;
  level: number;
}) {
  return (
    <>
      {tree.children
        .filter(
          (child): child is ContainerNode<TreeFolder, TreeWfc> =>
            child.type === "container"
        )
        .map((child) => {
          return (
            <div
              key={child.data.id}
              style={{
                paddingLeft: level * 6,
              }}
            >
              {level > 0 ? <span className="opacity-50">- </span> : null}
              <Link
                href={Routes.PlacemarkIndex({ parent: child.data.id })}
                className={clsx(
                  "text-sm hover:underline",
                  parent === child.data.id && "font-semibold"
                )}
              >
                {child.data.name}
              </Link>
              <FolderTree parent={parent} tree={child} level={level + 1} />
            </div>
          );
        })}
    </>
  );
}

export function WrappedFeatureCollectionList() {
  const parent = useParent();
  const [listMode, setListMode] = useAtom(listModeAtom);
  const [showFolderTree, setShowFolderTree] = useAtom(showFolderTreeAtom);
  const {
    user: { darkMode },
  } = useUpdateUser();

  const sensor = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 2,
      },
    })
  );

  const setDialogState = useSetAtom(dialogAtom);

  const [editWrappedFeatureCollectionFolder] = useMutation(
    editWrappedFeatureCollectionFolderMutation
  );

  const [editWrappedFeatureCollection] = useMutation(
    editWrappedFeatureCollectionMutation
  );

  const [tree] = useQuery(getWrappedFeatureCollectionTree, {});

  const res = parent
    ? pullNode(tree, "id", parent)
    : {
        node: tree,
        path: null,
      };

  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);

  const rowItems = res?.node?.children.map((item) => {
    if (item.type === "container") {
      return (
        <FolderRowDisplay
          grid={listMode === "grid"}
          folderNode={item}
          key={item.data.id}
          selected={selectedCollections.includes(item.data.id)}
          onResetSelections={() => {
            setSelectedCollections([]);
          }}
          onSelect={(featureCollection) => {
            setSelectedCollections(
              toggle(selectedCollections, featureCollection.id)
            );
          }}
        />
      );
    }
    const featureCollection = item.data;
    return (
      <FeatureCollectionRowDisplay
        grid={listMode === "grid"}
        darkMode={darkMode}
        featureCollection={featureCollection}
        key={featureCollection.id}
        selected={selectedCollections.includes(featureCollection.id)}
        onResetSelections={() => {
          setSelectedCollections([]);
        }}
        onSelect={(featureCollection) => {
          setSelectedCollections(
            toggle(selectedCollections, featureCollection.id)
          );
        }}
      />
    );
  });

  const displayModeToggle = (
    <div className="flex gap-x-2">
      <ToggleGroup.Root
        type="single"
        value={listMode}
        className="inline-flex items-center border border-gray-200 dark:border-gray-700 dark:bg-gray-800 rounded-md"
        onValueChange={(value) => {
          if (value) setListMode(value as unknown as "grid" | "list");
        }}
      >
        <ToggleGroup.Item asChild value="grid">
          <Button title="Grid" variant="quiet" side="left">
            <ViewGridIcon />
          </Button>
        </ToggleGroup.Item>
        <ToggleGroup.Item asChild value="list">
          <Button title="List" variant="quiet" side="right">
            <ViewHorizontalIcon />
          </Button>
        </ToggleGroup.Item>
      </ToggleGroup.Root>
      <Button
        title="Search"
        variant="quiet"
        onClick={() => {
          setDialogState({
            type: "quickswitcher_index",
          });
        }}
      >
        <MagnifyingGlassIcon />
      </Button>
      <Button
        title="Show folder tree"
        variant="quiet"
        onClick={() => {
          setShowFolderTree((val) => (val === "hide" ? "show" : "hide"));
        }}
      >
        <FolderDetails className="w-4 h-4" />
      </Button>
    </div>
  );

  const path = res?.path;

  return (
    <DndContext
      sensors={sensor}
      modifiers={[restrictToWindowEdges]}
      collisionDetection={pointerWithin}
      onDragStart={(_evt) => {
        // PASS
      }}
      onDragEnd={(evt) => {
        const source = evt.active?.data.current as
          | WrappedFeatureCollectionFolder
          | WrappedFeatureCollection;
        const target = evt.over?.data.current as
          | WrappedFeatureCollectionFolder
          | WrappedFeatureCollection;

        evt.activatorEvent.preventDefault();

        if (source && target && source !== target) {
          (async () => {
            if ("access" in source) {
              return editWrappedFeatureCollection({
                id: source.id,
                wrappedFeatureCollectionFolderId: target.id,
              });
            } else {
              return editWrappedFeatureCollectionFolder({
                id: source.id,
                folderId: target.id,
                name: source.name,
              });
            }
          })()
            .then(() => {
              return invalidateQuery(getWrappedFeatureCollectionTree, {});
            })
            .catch((e) => {
              Sentry.captureException(e);
            });
        }

        return null;
      }}
      onDragCancel={(evt) => {
        evt.activatorEvent.preventDefault();
      }}
    >
      <div>
        <div className="pb-4 flex items-center gap-x-2">
          {displayModeToggle}
          <Breadcrumbs path={path} parent={parent} />
        </div>
        <div
          className={showFolderTree === "show" ? "grid" : ""}
          style={{
            gridTemplateColumns: "200px 1fr",
          }}
        >
          {showFolderTree === "show" ? (
            <div>
              <div className="pr-1 py-1 border-b border-gray-100 dark:border-gray-700 mb-1 pb-1 flex items-center gap-x-1">
                <FolderDetails className="w-4 h-4" />
                <Link
                  href={Routes.PlacemarkIndex({})}
                  className="font-semibold text-sm"
                >
                  Home
                </Link>
                <div className="flex-auto" />
                <Button
                  variant="quiet"
                  onClick={() => {
                    setShowFolderTree("hide");
                  }}
                >
                  <PinLeftIcon className="w-3 h-3" />
                </Button>
              </div>
              <div className="overflow-x-auto">
                <FolderTree parent={parent} tree={tree} level={0} />
              </div>
            </div>
          ) : null}
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {selectedCollections.length ? (
              <MultiCollectionActions
                selectedCollections={selectedCollections}
                onClear={() => {
                  setSelectedCollections([]);
                }}
              />
            ) : null}

            {listMode === "list" ? (
              <>
                {selectedCollections.length ? null : (
                  <div
                    className="grid items-center text-gray-500 dark:text-gray-300 pb-1"
                    style={{
                      gridTemplateColumns: "40px 1fr 1fr 1fr 50px",
                    }}
                  >
                    <div></div>
                    <div className="pl-2">Name</div>
                    <div className="text-right">Features</div>
                    <div className="text-right pr-2">Updated</div>
                    <div></div>
                  </div>
                )}
                {rowItems?.length ? (
                  rowItems
                ) : (
                  <div className="col-span-4 py-10">
                    <EmptyState />
                  </div>
                )}
              </>
            ) : rowItems?.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rowItems}
              </div>
            ) : (
              <EmptyState />
            )}
          </div>
        </div>
      </div>
    </DndContext>
  );
}
