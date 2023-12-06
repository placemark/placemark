import { useRouter } from "next/router";
import { useMutation } from "@blitzjs/rpc";
import { Routes } from "@blitzjs/next";
import { useState, useEffect, useCallback } from "react";
import { useSetAtom } from "jotai";
import { dialogAtom } from "state/jotai";
import * as Sentry from "@sentry/nextjs";
import createWrappedFeatureCollectionMutation from "app/wrappedFeatureCollections/mutations/createWrappedFeatureCollection";
import { getFilesFromDataTransferItems } from "@placemarkio/flat-drop-files";
import type { FileWithHandle } from "browser-fs-access";
import { groupFiles } from "app/lib/group_files";
import { StyledDropOverlayIndex } from "./elements";
import { allowNativePaste } from "app/lib/utils";
import toast from "react-hot-toast";
import { DialogState } from "state/dialog_state";
import { UNTITLED } from "app/lib/constants";
import { useParent } from "app/hooks/use_parent";

const stopWindowDrag = (event: DragEvent) => {
  event.preventDefault();
};

function getMapNameFromFiles(files: FileWithHandle[]): string | null {
  const file = files[0];
  if (!file) return null;
  const name = file.name;
  if (!name) return null;
  return name;
}

export function hackInitialDialog(dialogState: DialogState) {
  (window as any).initialDialog = dialogState;
}

export function useOnDropFiles() {
  const router = useRouter();

  const [createWrappedFeatureCollection] = useMutation(
    createWrappedFeatureCollectionMutation
  );

  return useCallback(
    (files: FileWithHandle[], parent: string | null = null) => {
      if (!files.length) {
        return;
      }

      const nameFromFiles = getMapNameFromFiles(files);
      createWrappedFeatureCollection({
        name: nameFromFiles ?? UNTITLED,
        folderId: parent,
      })
        .then(async (map) => {
          hackInitialDialog({
            type: "import",
            files: groupFiles(files),
          });
          await router.push(
            Routes.PersistedMap({ wrappedFeatureCollectionId: map })
          );
        })
        .catch((e) => Sentry.captureException(e));
    },
    [createWrappedFeatureCollection, router]
  );
}

/**
 * Variation of Drop that is meant for the Index
 * page, in which there is no map.
 */
export function DropIndex() {
  const parent = useParent();
  const router = useRouter();
  const onDropFiles = useOnDropFiles();
  const [createWrappedFeatureCollection] = useMutation(
    createWrappedFeatureCollectionMutation
  );
  const [dragging, setDragging] = useState<boolean>(false);
  const setDialogState = useSetAtom(dialogAtom);

  useEffect(() => {
    const onPasteText = (text: string) => {
      if (!text.length) {
        return;
      }

      createWrappedFeatureCollection({
        name: "Map from clipboard",
      })
        .then(async (map) => {
          hackInitialDialog({
            type: "load_text",
            initialValue: text,
          });
          await router.push(
            Routes.PersistedMap({ wrappedFeatureCollectionId: map })
          );
        })
        .catch((e) => Sentry.captureException(e));
    };

    const onDragEnter = () => {
      setDragging(true);
    };

    const onDragLeave = (event: DragEvent) => {
      if (!event.relatedTarget) {
        setDragging(false);
      }
    };

    const onDrop = async (event: DragEvent) => {
      setDragging(false);
      const files = event.dataTransfer?.items
        ? await getFilesFromDataTransferItems(event.dataTransfer.items)
        : [];
      onDropFiles(files, parent);
      event.preventDefault();
    };

    const onDropCaught = (event: DragEvent) => {
      onDrop(event).catch((e) => Sentry.captureException(e));
    };

    const onPaste = (e: ClipboardEvent) => {
      if (!e.clipboardData || allowNativePaste(e)) return;
      e.preventDefault();
      const textContent = e.clipboardData.getData("text");
      if (!textContent) return;
      if (textContent.length > 10000) {
        toast.error("Copy & paste detected, but it was too long.");
        return;
      }
      onPasteText(textContent);
    };

    document.addEventListener("dragenter", onDragEnter);
    document.addEventListener("dragleave", onDragLeave);
    document.addEventListener("drop", onDropCaught);
    document.addEventListener("paste", onPaste);
    window.addEventListener("dragover", stopWindowDrag);
    window.addEventListener("drop", stopWindowDrag);

    return () => {
      document.removeEventListener("dragenter", onDragEnter);
      document.removeEventListener("dragleave", onDragLeave);
      document.removeEventListener("drop", onDropCaught);
      document.removeEventListener("paste", onPaste);
      window.removeEventListener("dragover", stopWindowDrag);
      window.removeEventListener("drop", stopWindowDrag);
    };
  }, [
    setDragging,
    setDialogState,
    createWrappedFeatureCollection,
    onDropFiles,
    router,
    parent,
  ]);

  return dragging ? (
    <StyledDropOverlayIndex>Drop files to import</StyledDropOverlayIndex>
  ) : null;
}
