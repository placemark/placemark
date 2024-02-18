import type { ModalStateImport } from "state/jotai";
import type { ConvertResult } from "app/lib/convert/utils";
import { PlusCircledIcon } from "@radix-ui/react-icons";
import { DialogHeader } from "app/components/dialog";
import { useContext, useState } from "react";
import { truncate } from "app/lib/utils";
import { Maybe, Nothing } from "purify-ts/Maybe";
import { extendExtent, getExtent } from "app/lib/geometry";
import { BBox } from "types";
import { MapContext } from "app/context/map_context";
import { LngLatBoundsLike } from "mapbox-gl";
import addedFeaturesToast from "app/components/added_features_toast";
import { flattenResult } from "./import_utils";
import { ImportFileGroup } from "./import/import_file_group";
import { ImportShapefile } from "./import/import_shapefile";
import { usePersistence } from "app/lib/persistence/context";
import { UNTITLED } from "app/lib/constants";
import { getFileName } from "app/lib/group_files";
import * as Sentry from "@sentry/nextjs";

export type OnNext = (arg0: ConvertResult | null) => void;

export function ImportDialog({
  modal,
  onClose,
}: {
  modal: ModalStateImport;
  onClose: () => void;
}) {
  const { files } = modal;
  const map = useContext(MapContext);
  const rep = usePersistence();
  const [meta, setMeta] = rep.useMetadata();

  const [index, setIndex] = useState<number>(0);
  const [extent, setExtent] = useState<Maybe<BBox>>(Nothing);

  const file = files[index];
  const progress = files.length > 1 ? `(${index}/${files.length})` : "";
  const hasNext = index < files.length - 1;

  async function maybeRename() {
    if (meta.type === "persisted" && meta.name === UNTITLED) {
      try {
        await setMeta({
          name: getFileName(file),
        });
      } catch (e) {
        Sentry.captureException(e);
      }
    }
  }

  const onNext: OnNext = (result) => {
    let nextExtent = extent;
    if (result) {
      void maybeRename();
      nextExtent = extendExtent(getExtent(flattenResult(result)), extent);
    }
    if (hasNext) {
      setExtent(nextExtent);
      setIndex((i) => i + 1);
    } else {
      nextExtent.map((importedExtent) => {
        map?.map.fitBounds(importedExtent as LngLatBoundsLike, {
          padding: 100,
        });
      });
      if (result) {
        addedFeaturesToast(result);
      }
      return onClose();
    }
  };

  const props = {
    hasNext: hasNext,
    onClose: onClose,
    onNext,
    secondary: hasNext
      ? {
          action: "Skip",
          onClick: () => {
            props.onNext(null);
          },
        }
      : undefined,
  };

  return (
    <>
      <DialogHeader
        title={`Import ${truncate(
          file.type === "file" ? file.file.name : "Shapefile"
        )} ${progress}`}
        titleIcon={PlusCircledIcon}
      />
      {file.type === "file" ? (
        <ImportFileGroup {...props} file={file} />
      ) : (
        <ImportShapefile {...props} file={file} />
      )}
    </>
  );
}
