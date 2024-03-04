import { memo, useState, useEffect } from "react";
import { useSetAtom } from "jotai";
import { dialogAtom } from "state/jotai";
import * as Sentry from "@sentry/nextjs";
import { getFilesFromDataTransferItems } from "@placemarkio/flat-drop-files";
import type { FileWithHandle } from "browser-fs-access";
import { groupFiles } from "app/lib/group_files";
import { StyledDropOverlay } from "./elements";

/**
 * From an event, get files, with handles for re-saving.
 * Result is nullable.
 */

const stopWindowDrag = (event: DragEvent) => {
  event.preventDefault();
};

export default memo(function Drop() {
  const [dragging, setDragging] = useState<boolean>(false);
  const setDialogState = useSetAtom(dialogAtom);

  useEffect(() => {
    const onDropFiles = (files: FileWithHandle[]) => {
      if (!files.length) return;
      setDialogState({
        type: "import",
        files: groupFiles(files),
      });
    };

    const onDragEnter = () => {
      setDragging(true);
    };

    const onDragLeave = (event: DragEvent) => {
      if (!event.relatedTarget) {
        setDragging(false);
        return;
      }
      const portals = document.querySelectorAll("[data-radix-portal]");
      for (const portal of portals) {
        if (
          event.relatedTarget instanceof Node &&
          portal.contains(event.relatedTarget)
        ) {
          setDragging(false);
          return;
        }
      }
    };

    const onDrop = async (event: DragEvent) => {
      setDragging(false);
      const files = event.dataTransfer?.items
        ? await getFilesFromDataTransferItems(event.dataTransfer.items)
        : [];
      onDropFiles(files);
      event.preventDefault();
    };

    const onDropCaught = (event: DragEvent) => {
      onDrop(event).catch((e) => Sentry.captureException(e));
    };

    document.addEventListener("dragenter", onDragEnter);
    document.addEventListener("dragleave", onDragLeave);
    document.addEventListener("drop", onDropCaught);
    window.addEventListener("dragover", stopWindowDrag);
    window.addEventListener("drop", stopWindowDrag);

    return () => {
      document.removeEventListener("dragenter", onDragEnter);
      document.removeEventListener("dragleave", onDragLeave);
      document.removeEventListener("drop", onDropCaught);
      window.removeEventListener("dragover", stopWindowDrag);
      window.removeEventListener("drop", stopWindowDrag);
    };
  }, [setDragging, setDialogState]);

  return dragging ? (
    <StyledDropOverlay>Drop files to add to the map</StyledDropOverlay>
  ) : null;
});
