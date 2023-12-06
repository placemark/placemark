import Link from "next/link";
import { invalidateQuery, useMutation } from "@blitzjs/rpc";
import { Routes } from "@blitzjs/next";
import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import * as DD from "@radix-ui/react-dropdown-menu";
import {
  styledCheckbox,
  DDContent,
  StyledItem,
  DDSeparator,
  TextWell,
  Button,
  StyledAlertDialogContent,
  StyledAlertDialogOverlay,
} from "app/components/elements";
import deleteWrappedFeatureCollectionsAndFoldersMutation from "app/wrappedFeatureCollections/mutations/deleteWrappedFeatureCollectionsAndFolders";
import duplicateWrappedFeatureCollectionMutation from "app/wrappedFeatureCollections/mutations/duplicateWrappedFeatureCollection";
import type {
  TreeWfc,
  TreeFolder,
} from "app/wrappedFeatureCollections/queries/getWrappedFeatureCollectionTree";
import { useSetAtom } from "jotai";
import * as Sentry from "@sentry/nextjs";
import React, { DragEventHandler, useCallback, useState } from "react";
import { pluralize, formatCount, formatDateAgo } from "app/lib/utils";
import toast from "react-hot-toast";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import clsx from "clsx";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { useCombinedRefs, CSS } from "@dnd-kit/utilities";
import { Folder16 } from "app/components/icons";
import getWrappedFeatureCollectionTree from "app/wrappedFeatureCollections/queries/getWrappedFeatureCollectionTree";
import { collectChildren, ContainerNode } from "app/lib/tree";
import { dialogAtom } from "state/dialog_state";
import { useOnDropFiles } from "app/components/drop_index";
import { getFilesFromDataTransferItems } from "@placemarkio/flat-drop-files";

const DRAGGING_CLASSES = "opacity-70 z-50 pointer-events-none";

const MoreActions = () => (
  <DD.Trigger
    aria-label="More actions"
    className="px-2 block flex items-center text-gray-500
            hover:text-gray-700 dark:hover:text-gray-300
            focus:bg-gray-100 dark:focus:bg-gray-700
            aria-expanded:bg-gray-200 dark:aria-expanded:bg-gray-800"
  >
    <DotsHorizontalIcon />
  </DD.Trigger>
);

function PreDeleteDialog({
  onResetSelections,
  folderNode,
  onClose,
}: {
  onResetSelections: () => void;
  folderNode: ContainerNode<TreeFolder, TreeWfc>;
  onClose: () => void;
}) {
  const children = [...collectChildren(folderNode)];
  const folder = folderNode.data;

  const [deleteWrappedFeatureCollectionsAndFolders] = useMutation(
    deleteWrappedFeatureCollectionsAndFoldersMutation
  );

  return (
    <StyledAlertDialogContent>
      <TextWell>
        Are you sure you want to delete this folder, and the folders and maps it
        contains?
        <ul className="list-disc px-6 py-4 space-y-2">
          {children.map((child) => {
            return (
              <li key={child.data.id}>
                {child.type === "container" ? (
                  <Folder16 className="inline-flex mr-2 w-4 h-4" />
                ) : null}
                {child.data.name}{" "}
                {child.type === "leaf"
                  ? `(${pluralize(
                      "feature",
                      child.data._count.wrappedFeatures
                    )})`
                  : null}
              </li>
            );
          })}
        </ul>
      </TextWell>
      <div className="flex justify-between pt-4">
        <AlertDialog.Cancel asChild>
          <Button>Cancel</Button>
        </AlertDialog.Cancel>
        <Button
          variant="destructive"
          onClick={() => {
            toast
              .promise(
                (async () => {
                  await deleteWrappedFeatureCollectionsAndFolders({
                    ids: [folder.id].concat(
                      Array.from(children, (child) => child.data.id)
                    ),
                  });
                  await invalidateQuery(getWrappedFeatureCollectionTree, {});
                  onResetSelections();
                  onClose();
                })(),
                {
                  loading: "Deleting folder",
                  success: "Deleted folder",
                  error: "Failed to delete folder",
                }
              )
              .catch((e) => Sentry.captureException(e));
          }}
        >
          Delete
        </Button>
      </div>
    </StyledAlertDialogContent>
  );
}

export function FolderRowDisplay({
  folderNode,
  selected,
  onSelect,
  onResetSelections,
  grid = false,
}: {
  folderNode: ContainerNode<TreeFolder, TreeWfc>;
  selected: boolean;
  onSelect: (arg0: TreeFolder) => void;
  onResetSelections: () => void;
  grid: boolean;
}) {
  const folder = folderNode.data;
  // TODO
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableNodeRef,
    isDragging,
    transform,
  } = useDraggable({
    id: folder.id,
    data: folder,
  });
  const { isOver, setNodeRef: setDroppableNodeRef } = useDroppable({
    id: folder.id,
    data: folder,
  });

  const onDropFiles = useOnDropFiles();

  const [isTargeted, setIsTargeted] = useState<boolean>(false);

  const onDragEnter: DragEventHandler<HTMLElement> = useCallback(
    (_e) => {
      setIsTargeted(true);
    },
    [setIsTargeted]
  );
  const onDragLeave: DragEventHandler<HTMLElement> = useCallback(
    (e) => {
      if (
        "contains" in e.target &&
        e.relatedTarget &&
        (e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)
      ) {
        return;
      }
      setIsTargeted(false);
    },
    [setIsTargeted]
  );
  const onDrop: DragEventHandler<HTMLElement> = useCallback(
    (event) => {
      event.preventDefault();
      (async () => {
        const files = event.dataTransfer?.items
          ? await getFilesFromDataTransferItems(event.dataTransfer.items)
          : [];
        onDropFiles(files, folder.id);
      })().catch((e) => Sentry.captureException(e));
    },
    [onDropFiles, folder]
  );

  const setModal = useSetAtom(dialogAtom);
  const setNodeRef = useCombinedRefs(setDraggableNodeRef, setDroppableNodeRef);
  const [alertOpen, setAlertOpen] = useState<boolean>(false);

  const { createdBy } = folder;

  const setForCount = collectChildren(folderNode);
  setForCount.delete(folderNode);
  const childrenForCount = [...setForCount];

  const dotMenu = (
    <AlertDialog.Root open={alertOpen} onOpenChange={setAlertOpen}>
      <StyledAlertDialogOverlay />
      <PreDeleteDialog
        folderNode={folderNode}
        onResetSelections={onResetSelections}
        onClose={() => setAlertOpen(false)}
      />

      <div
        className="flex self-stretch justify-end"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <DD.Root>
          <MoreActions />
          <DDContent>
            <StyledItem
              onSelect={() => {
                setModal({
                  type: "rename_folder",
                  id: folder.id,
                  folderId: folder.folderId,
                  name: folder.name,
                });
              }}
            >
              Rename
            </StyledItem>
            <DDSeparator />

            <AlertDialog.Trigger asChild>
              <StyledItem variant="destructive">Delete</StyledItem>
            </AlertDialog.Trigger>
          </DDContent>
        </DD.Root>
      </div>
    </AlertDialog.Root>
  );

  if (grid) {
    const borders = `border-purple-300
        hover:border-purple-400 group-hover:border-purple-400
        dark:border-purple-700 dark:hover:border-purple-600 dark:group-hover:border-purple-600`;
    return (
      <section
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        style={{ transform: CSS.Transform.toString(transform) }}
        className={clsx(
          "group aspect-video flex flex-col relative touch-none",
          isDragging && DRAGGING_CLASSES
        )}
      >
        <Link
          href={Routes.PlacemarkIndex({
            parent: folder.id,
          })}
          className={clsx(`flex-auto flex flex-col items-stretch`)}
        >
          <div
            className={clsx(
              `flex-auto flex items-start flex-col justify-start p-4 gap-x-2 bg-purple-50 rounded-lg
              dark:bg-purple-900
              text-xs uppercase font-semibold
              border`,
              (isOver || isTargeted) && "ring-2 ring-purple-500",
              borders
            )}
          >
            <div>
              {pluralize(
                "Folder",
                childrenForCount.filter((child) => child.type === "container")
                  .length
              )}
            </div>
            <div>
              {pluralize(
                "Map",
                childrenForCount.filter((child) => child.type === "leaf").length
              )}
            </div>
          </div>
        </Link>
        <div
          className={clsx(
            "text-sm py-0.5 flex items-center justify-between gap-x-2"
          )}
        >
          <Folder16 />
          <Link
            href={Routes.PlacemarkIndex({
              parent: folder.id,
            })}
            className={clsx(`block flex-auto`)}
          >
            {folder.name}
          </Link>
          {dotMenu}
        </div>
      </section>
    );
  }

  return (
    <section
      className={clsx(
        "flex items-center group",
        isDragging && DRAGGING_CLASSES,
        isTargeted && "ring-2 ring-purple-500"
      )}
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      style={{ transform: CSS.Transform.toString(transform) }}
    >
      <RowCheckbox
        checked={selected}
        onChange={() => {
          onSelect(folder);
        }}
      />
      <Link
        href={Routes.PlacemarkIndex({
          parent: folder.id,
        })}
        className="flex-auto pl-2 grid text-gray-700 dark:text-gray-300 items-center
        hover:bg-gray-100 dark:hover:bg-gray-800
        focus:bg-gray-100 dark:focus:bg-gray-800
        "
        style={{
          gridTemplateColumns: "1fr 1fr 1fr",
        }}
      >
        <div className="py-1 flex gap-x-2 items-center truncate">
          <Folder16 />
          <span className="truncate">{folder.name}</span>
        </div>
        <div className="opacity-70 text-right"></div>
        <div
          className="opacity-70 text-right pr-2"
          title={`Created by ${
            createdBy ? createdBy.name || createdBy.email : "a user"
          }`}
        ></div>
      </Link>
      {dotMenu}
    </section>
  );
}

export function FeatureCollectionRowDisplay({
  featureCollection,
  selected,
  onSelect,
  darkMode,
  onResetSelections,
  grid = false,
}: {
  featureCollection: TreeWfc;
  selected: boolean;
  onSelect: (arg0: TreeWfc) => void;
  darkMode: boolean;
  onResetSelections: () => void;
  grid: boolean;
}) {
  const { isDragging, attributes, listeners, setNodeRef, transform } =
    useDraggable({
      id: featureCollection.id,
      data: featureCollection,
    });
  const setModal = useSetAtom(dialogAtom);
  const [deleteWrappedFeatureCollectionsAndFolders] = useMutation(
    deleteWrappedFeatureCollectionsAndFoldersMutation
  );
  const [duplicateWrappedFeatureCollection] = useMutation(
    duplicateWrappedFeatureCollectionMutation
  );
  const { createdBy } = featureCollection;

  const dotMenu = (
    <div
      className="flex self-stretch justify-end"
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <DD.Root>
        <MoreActions />
        <DDContent>
          <StyledItem
            onSelect={() => {
              setModal({
                type: "rename_map",
                id: featureCollection.id,
                name: featureCollection.name,
                description: featureCollection.description,
              });
            }}
          >
            Rename
          </StyledItem>
          <StyledItem
            onSelect={async () => {
              await toast.promise(
                duplicateWrappedFeatureCollection({
                  id: featureCollection.id,
                }).then(() =>
                  invalidateQuery(getWrappedFeatureCollectionTree, {})
                ),
                {
                  loading: "Duplicating map…",
                  success: "Duplicated!",
                  error: "Error duplicating map",
                }
              );
            }}
          >
            Duplicate
          </StyledItem>
          <DDSeparator />
          <StyledItem
            variant="destructive"
            onSelect={async () => {
              if (
                !confirm(
                  "Are you sure you want to permanently delete this map?"
                )
              ) {
                return false;
              }
              await toast.promise(
                (async () => {
                  await deleteWrappedFeatureCollectionsAndFolders({
                    ids: [featureCollection.id],
                  });
                  await invalidateQuery(getWrappedFeatureCollectionTree, {});
                  onResetSelections();
                })(),
                {
                  loading: "Deleting map",
                  success: "Deleted map",
                  error: "Failed to delete map",
                }
              );
            }}
          >
            Delete
          </StyledItem>
        </DDContent>
      </DD.Root>
    </div>
  );

  if (grid) {
    const params = new URLSearchParams({
      id: featureCollection.id,
    });
    params.append("darkMode", darkMode.toString());
    return (
      <section
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        style={{ transform: CSS.Transform.toString(transform) }}
        className={clsx(
          "aspect-video flex flex-col relative touch-none",
          isDragging && DRAGGING_CLASSES
        )}
      >
        <Link
          href={Routes.PersistedMap({
            wrappedFeatureCollectionId: featureCollection.id,
          })}
          className="block flex-auto bg-gray-50 rounded-md
            border
            border-gray-300 hover:border-gray-400
            dark:border-gray-700 dark:hover:border-gray-600
            focus:ring-1 focus:ring-purple-500 ring-offset-2
          "
          style={{
            backgroundSize: "cover",
            backgroundPosition: "center center",
            backgroundImage: `url(/api/thumbnail?${params.toString()}`,
          }}
        ></Link>
        <div
          className="grid items-center"
          style={{
            gridTemplateColumns:
              featureCollection.access === "PUBLIC"
                ? "1fr min-content min-content"
                : "1fr min-content",
          }}
        >
          <Link
            href={Routes.PersistedMap({
              wrappedFeatureCollectionId: featureCollection.id,
            })}
            tabIndex={-1}
            className="text-gray-700 dark:text-gray-300 items-center gap-x-2 truncate"
          >
            <span className="py-1 text-sm">{featureCollection.name}</span>
          </Link>
          {featureCollection.access === "PUBLIC" ? (
            <span className="inline text-xs font-semibold opacity-50 pl-1">
              {featureCollection.access}
            </span>
          ) : null}
          {dotMenu}
        </div>
      </section>
    );
  }

  return (
    <section
      className={clsx(
        "flex items-center group",
        isDragging && DRAGGING_CLASSES
      )}
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ transform: CSS.Transform.toString(transform) }}
    >
      <RowCheckbox
        checked={selected}
        onChange={() => {
          onSelect(featureCollection);
        }}
      />
      <Link
        href={Routes.PersistedMap({
          wrappedFeatureCollectionId: featureCollection.id,
        })}
        className="flex-auto pl-2 grid text-gray-700 dark:text-gray-300 items-center
        hover:bg-gray-100 dark:hover:bg-gray-800
        focus:bg-gray-100 dark:focus:bg-gray-800
        "
        style={{
          gridTemplateColumns: "1fr 1fr 1fr",
        }}
      >
        <div className="py-1 flex gap-x-2 items-center truncate">
          <span className="truncate">{featureCollection.name}</span>
          {featureCollection.access === "PUBLIC" ? (
            <div className="text-xs font-semibold opacity-50">
              {featureCollection.access}
            </div>
          ) : null}
        </div>
        <div className="opacity-70 text-right">
          {formatCount(featureCollection._count?.wrappedFeatures)}
        </div>
        <div
          className="opacity-70 text-right pr-2"
          title={`Created by ${
            createdBy ? createdBy.name || createdBy.email : "a user"
          }`}
        >
          {formatDateAgo(new Date(), featureCollection.updatedAt)}
        </div>
      </Link>
      {dotMenu}
    </section>
  );
}

function RowCheckbox(attrs: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div
      className="py-1 pl-2 flex items-center self-stretch"
      style={{
        width: 40,
      }}
    >
      <input
        type="checkbox"
        className={
          styledCheckbox({ variant: "default" }) +
          " opacity-50 group-hover:opacity-100 checked:opacity-100"
        }
        {...attrs}
      />
    </div>
  );
}
