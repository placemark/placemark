import { useSortable } from "@dnd-kit/sortable";
import {
  CopyIcon,
  LockClosedIcon,
  LockOpen2Icon,
  MagnifyingGlassIcon,
  TriangleRightIcon,
} from "@radix-ui/react-icons";
import clsx from "clsx";
import { useAtom } from "jotai";
import { usePersistence } from "app/lib/persistence/context";
import { IPersistence } from "app/lib/persistence/ipersistence";
import { USelection } from "state";
import { dataAtom, selectionAtom } from "state/jotai";
import { JsonValue } from "type-fest";
import { CSS } from "@dnd-kit/utilities";
import { InlineNameEditor } from "./inline_name_editor";
import { FlattenedFeature, FlattenedFolder, FlattenedItem } from "./math";
import * as CM from "@radix-ui/react-context-menu";
import {
  CMContent,
  CMItem,
  DDSeparator,
  VisibilityToggleIcon,
} from "app/components/elements";
import { GeometryActions } from "app/components/context_actions/geometry_actions";
import { IFolder, IWrappedFeature } from "types";
import { useAtomCallback } from "jotai/utils";
import { deleteFeatures } from "app/lib/map_operations/delete_features";
import { memo, useCallback } from "react";
import { collectFoldersByFolder, collectDescendents } from "app/lib/folder";
import { useZoomTo } from "app/hooks/use_zoom_to";
import { UniqueIdentifier } from "@dnd-kit/core";
import { duplicateFeatures } from "app/lib/map_operations/duplicate_features";

const visibilityToggleClass =
  "hidden opacity-30 hover:opacity-100 group-hover:inline-block pr-2";

export function ItemFolder({
  rep,
  item,
  overlay,
}: {
  rep: IPersistence;
  item: FlattenedFolder;
  overlay: boolean;
}) {
  const transact = rep.useTransact();
  const { depth } = item;
  const [sel, setSelection] = useAtom(selectionAtom);
  const folder = item.data;
  const selected = USelection.isFolderSelected(sel, folder.id);
  const folderSelected =
    folder.folderId && USelection.isFolderSelected(sel, folder.folderId);
  const selState = selected ? "direct" : folderSelected ? "secondary" : false;

  function handleToggleExpanded(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    void transact({
      note: "Toggled a folder",
      putFolders: [
        {
          ...folder,
          expanded: !folder.expanded,
        },
      ],
    });
  }

  function handleToggleLocked(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    void transact({
      note: "Toggled a folder’s locking",
      putFolders: [
        {
          ...folder,
          locked: !folder.locked,
        },
      ],
    });
  }

  function handleToggleVisibility(e: React.MouseEvent<HTMLDivElement>) {
    e.stopPropagation();
    void transact({
      note: "Toggled a folder’s visibility",
      track: "folder-toggle-visibility",
      putFolders: [
        {
          ...folder,
          visibility: !folder.visibility,
        },
      ],
    });
  }

  return (
    <div
      className={sharedStyle({
        selected: selState,
        overlay,
        visibility: folder.visibility,
      })}
      onClick={() => {
        setSelection(USelection.folder(folder.id));
      }}
      data-at={folder.at}
    >
      <Spacer selected={selState} depth={depth} />
      <button
        title="Expand / collapse"
        onClick={handleToggleExpanded}
        className={clsx(
          "opacity-0 group-hover:opacity-50",
          folder.expanded ? "transform rotate-90" : ""
        )}
      >
        <TriangleRightIcon className="w-4" />
      </button>
      <InlineNameEditor folder={folder} rep={rep} />
      <div className="flex-auto" />
      <button
        title="Toggle locked"
        onClick={handleToggleLocked}
        className="pr-2"
      >
        {folder.locked ? (
          <LockClosedIcon className="w-3 h-3" />
        ) : (
          <LockOpen2Icon className="w-3 h-3 hidden opacity-30 group-hover:inline-block hover:opacity-100 " />
        )}
      </button>
      <div
        role="checkbox"
        title="Toggle visibility"
        onClick={handleToggleVisibility}
        aria-checked={folder.visibility}
        className={visibilityToggleClass}
      >
        <VisibilityToggleIcon visibility={folder.visibility} />
      </div>
    </div>
  );
}

export function ItemInner({
  item,
  preview,
  overlay,
  treeCurrentValueRef,
}: {
  item: FlattenedItem;
  preview: string | null;
  overlay: boolean;
  treeCurrentValueRef: React.MutableRefObject<FlattenedItem[]>;
}) {
  const rep = usePersistence();

  if (item.kind === "folder") {
    return <ItemFolder overlay={overlay} rep={rep} item={item} />;
  } else {
    return (
      <ItemFeature
        overlay={overlay}
        item={item}
        rep={rep}
        preview={preview}
        treeCurrentValueRef={treeCurrentValueRef}
      />
    );
  }
}

function toggleFeatureVisibility(
  feature: IWrappedFeature,
  force?: boolean
): IWrappedFeature {
  const newProperties = { ...feature.feature.properties } || {};
  const wasVisible =
    force !== undefined ? force : newProperties.visibility === false;
  if (wasVisible) {
    delete newProperties.visibility;
  } else {
    newProperties.visibility = false;
  }
  return {
    ...feature,
    feature: {
      ...feature.feature,
      properties: newProperties,
    },
  };
}

function Spacer({
  selected,
  feature = false,
  depth,
}: {
  selected: false | "direct" | "secondary";
  feature?: boolean;
  depth: number;
}) {
  return (
    <div
      className={
        selected
          ? "border-purple-300 dark:border-purple-300"
          : "border-gray-200 dark:border-gray-700"
      }
      style={{
        height: 2,
        borderLeftWidth: depth * 16,
        marginRight: feature ? 16 : 0,
      }}
    />
  );
}

export function ItemFeature({
  item,
  rep,
  preview,
  overlay,
  treeCurrentValueRef,
}: {
  item: FlattenedFeature;
  rep: IPersistence;
  preview: string | null;
  overlay: boolean;
  treeCurrentValueRef: React.MutableRefObject<FlattenedItem[]>;
}) {
  const [sel, setSelection] = useAtom(selectionAtom);
  const zoomTo = useZoomTo();
  const feature = item.data;
  const { depth } = item;
  const selected = USelection.isSelected(sel, feature.id);
  const folderSelected =
    feature.folderId && USelection.isFolderSelected(sel, feature.folderId);
  const geometryLabel = feature.feature.geometry?.type || "Null geometry";
  const previewVal = limitPreviewValue(
    (preview && feature.feature.properties?.[preview]) as JsonValue
  );
  const transact = rep.useTransact();

  const handleToggleVisibility = useAtomCallback(
    useCallback(
      (get, _set, e: React.MouseEvent<HTMLDivElement>) => {
        const data = get(dataAtom);
        e.stopPropagation();
        const selectedFeatures = USelection.getSelectedFeatures(data);
        if (selectedFeatures.length > 1) {
          const force = feature.feature.properties?.visibility === false;
          void transact({
            note: "Toggled a feature’s visibility",
            track: "feature-toggle-visibility",
            putFeatures: selectedFeatures.map((feature) =>
              toggleFeatureVisibility(feature, force)
            ),
          });
        } else {
          void transact({
            note: "Toggled a feature’s visibility",
            putFeatures: [toggleFeatureVisibility(feature)],
          });
        }
      },
      [feature, transact]
    )
  );

  const selState = selected ? "direct" : folderSelected ? "secondary" : false;

  return (
    <button
      className={sharedStyle({
        selected: selState,
        overlay,
      })}
      onDoubleClick={() => {
        void zoomTo([feature]);
      }}
      onClick={(e) => {
        setSelection((oldSelection) => {
          if (e.metaKey) {
            return USelection.toggleSelectionId(oldSelection, feature.id);
          } else if (e.shiftKey) {
            const ids = USelection.toIds(oldSelection);

            if (ids.length === 0) {
              return USelection.single(feature.id);
            }

            const treeValue = treeCurrentValueRef.current;

            const idx = treeValue.findIndex((item) => item.id === feature.id);
            const range = { min: idx, max: idx };

            const idSet = new Set(ids);

            for (let idx = 0; idx < treeValue.length; idx++) {
              // Only consider items that will expand the range.
              if (idx < range.min || idx > range.max) {
                const item = treeValue[idx];
                if (idSet.has(item.id)) {
                  if (idx < range.min) range.min = idx;
                  if (idx > range.max) range.max = idx;
                }
              }
            }

            const newIds: string[] = [];

            for (let i = range.min; i < range.max + 1; i++) {
              const item = treeValue[i];
              if (item?.kind === "feature") {
                newIds.push(item.id);
              }
            }

            return USelection.fromIds(newIds);
          }
          return USelection.single(feature.id);
        });
      }}
      data-at={item.at}
    >
      <Spacer selected={selState} depth={depth} feature />
      <span className="block select-none truncate flex-auto">
        {previewVal ? (
          <>
            {previewVal} <span className="opacity-20">{geometryLabel}</span>
          </>
        ) : (
          geometryLabel
        )}
      </span>
      <div
        role="checkbox"
        title="Toggle visibility"
        onClick={handleToggleVisibility}
        className={visibilityToggleClass}
        aria-checked={feature.feature.properties?.visibility !== false}
      >
        <VisibilityToggleIcon
          visibility={feature.feature.properties?.visibility !== false}
        />
      </div>
    </button>
  );
}

function limitPreviewValue(previewVal: JsonValue): string | undefined {
  if (typeof previewVal === "number") {
    previewVal = previewVal.toString();
  }
  if (typeof previewVal === "string") {
    previewVal = previewVal.slice(0, 32);
  } else {
    return undefined;
  }
  return previewVal;
}

export const OverlayItem = ({
  id,
  item,
  preview,
  treeCurrentValueRef,
  ...props
}: {
  id: UniqueIdentifier;
  preview: string | null;
  item: FlattenedItem;
  treeCurrentValueRef: React.MutableRefObject<FlattenedItem[]>;
}) => {
  return (
    <div className="absolute" {...props}>
      <ItemInner
        treeCurrentValueRef={treeCurrentValueRef}
        item={item}
        overlay
        preview={preview}
      />
    </div>
  );
};

function FeatureContextMenu({ item }: { item: FlattenedFeature }) {
  return (
    <GeometryActions selectedWrappedFeatures={[item.data]} as="context-item" />
  );
}

export const SortableItem = memo(function SortableItem({
  id,
  item,
  preview,
  isDragging,
  treeCurrentValueRef,
  depth,
  highlight,
}: {
  id: UniqueIdentifier;
  item: FlattenedItem;
  preview: string | null;
  isDragging: boolean;
  treeCurrentValueRef: React.MutableRefObject<FlattenedItem[]>;
  depth: number;
  highlight: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: id });

  const style: React.HTMLAttributes<HTMLDivElement>["style"] = {
    transform: CSS.Transform.toString(transform),
    transition,
    /**
     * Prevent the page from scrolling on an iPad
     */
    touchAction: "none",
  };

  return (
    <div
      {...attributes}
      {...listeners}
      ref={setNodeRef}
      style={style}
      className={clsx(
        isDragging ? "opacity-100" : "",
        highlight &&
          "ring-2 ring-purple-500 ring-inset bg-opacity-20 bg-purple-300 dark:bg-purple-700"
      )}
    >
      {isDragging ? (
        <div
          style={{
            height: 0,
            paddingLeft: 16 + depth * 16,
          }}
        >
          <div
            className="rounded-sm bg-purple-500 border border-purple-700"
            style={{
              height: 4,
            }}
          ></div>
        </div>
      ) : (
        <CM.Root>
          <CM.Trigger>
            <ItemInner
              overlay={false}
              preview={preview}
              item={item}
              treeCurrentValueRef={treeCurrentValueRef}
            />
          </CM.Trigger>
          <CM.Portal>
            <CMContent>
              {item.kind === "feature" ? (
                <FeatureContextMenu item={item} />
              ) : (
                <FolderActions folder={item.data} />
              )}
            </CMContent>
          </CM.Portal>
        </CM.Root>
      )}
    </div>
  );
});

function FolderActions({ folder }: { folder: IFolder }) {
  const rep = usePersistence();
  const transact = rep.useTransact();
  const zoomTo = useZoomTo();

  const duplicateFolder = useAtomCallback(
    useCallback(
      (get, set) => {
        const data = get(dataAtom);
        const { newSelection, moment } = duplicateFeatures({
          ...data,
          selection: USelection.folder(folder.id),
        });
        set(selectionAtom, newSelection);
        return transact(moment);
      },
      [transact, folder.id]
    )
  );

  const deleteFolder = useAtomCallback(
    useCallback(
      (get, set) => {
        const data = get(dataAtom);
        const { newSelection, moment } = deleteFeatures({
          ...data,
          selection: USelection.folder(folder.id),
        });
        set(selectionAtom, newSelection);
        return transact(moment);
      },
      [transact, folder.id]
    )
  );

  const zoomToFolder = useAtomCallback(
    useCallback(
      (get) => {
        const { featureMap, folderMap } = get(dataAtom);
        const folderId = folder.id;

        const folderIds = new Set<string>([folderId]);
        const zoomIds: IWrappedFeature["id"][] = [];
        const idMap = collectFoldersByFolder(folderMap);

        collectDescendents(folderId, idMap, folderIds);

        for (const feature of featureMap.values()) {
          if (feature.folderId && folderIds.has(feature.folderId)) {
            zoomIds.push(feature.id);
          }
        }

        void zoomTo({
          type: "multi",
          ids: zoomIds,
        });
      },
      [folder.id, zoomTo]
    )
  );

  return (
    <>
      <CMItem onSelect={duplicateFolder}>
        <CopyIcon />
        Duplicate
      </CMItem>
      <CMItem onSelect={zoomToFolder}>
        <MagnifyingGlassIcon />
        Zoom to
      </CMItem>
      <DDSeparator />
      <CMItem onSelect={deleteFolder} variant="destructive">
        Delete
      </CMItem>
    </>
  );
}

function sharedStyle({
  selected,
  overlay,
  visibility = true,
}: {
  selected: false | "direct" | "secondary";
  overlay: boolean;
  visibility?: boolean;
}) {
  return clsx(
    `text-xs block w-full
    text-left
    flex items-center
    py-1
    border-gray-100
    dark:text-white`,
    visibility ? "" : "text-gray-500 dark:text-gray-400",
    selected === "direct"
      ? "bg-opacity-40 bg-purple-300 dark:bg-purple-800"
      : selected === "secondary"
      ? "bg-opacity-40 bg-purple-200 dark:bg-purple-700"
      : `hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-200 dark:focus:bg-gray-700`,
    overlay ? "px-4 rounded-sm ring-1 ring-gray-500 shadow-md opacity-60" : ""
  );
}
