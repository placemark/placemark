import { useCallback, useEffect } from "react";
import { useImportString } from "app/hooks/use_import";
import { DEFAULT_IMPORT_OPTIONS } from "app/lib/convert";
import { dataAtom, selectedFeaturesAtom, selectionAtom } from "state/jotai";
import { IWrappedFeature, UWrappedFeature } from "types";
import { allowNativeCopy, allowNativePaste } from "app/lib/utils";
import toast from "react-hot-toast";
import { useAtomCallback } from "jotai/utils";
import * as Comlink from "comlink";
import { usePersistence } from "app/lib/persistence/context";
import { deleteFeatures } from "app/lib/map_operations/delete_features";
import { useZoomTo } from "./use_zoom_to";
import { getExtent } from "app/lib/geometry";
import { flattenResult } from "app/components/dialogs/import_utils";
import { Maybe } from "purify-ts/Maybe";
import { match } from "ts-pattern";
import { USelection } from "state";

export function stringifyFeatures(selectedFeatures: IWrappedFeature[]): Maybe<{
  data: string;
  message: string;
}> {
  switch (selectedFeatures.length) {
    case 0: {
      return Maybe.empty();
    }
    case 1: {
      return Maybe.of({
        data: JSON.stringify(selectedFeatures[0].feature),
        message: "Copied feature as GeoJSON",
      });
    }
    default: {
      return Maybe.of({
        data: JSON.stringify(
          UWrappedFeature.toFeatureCollection(selectedFeatures)
        ),
        message: "Copied features as GeoJSON",
      });
    }
  }
}

export function useClipboard() {
  const rep = usePersistence();
  const transact = rep.useTransact();
  const importString = useImportString();
  const zoomTo = useZoomTo();

  const onCut = useAtomCallback(
    useCallback(
      (get, set, e: ClipboardEvent) => {
        if (!e.clipboardData || allowNativeCopy(e)) return;

        const selectedFeatures = get(selectedFeaturesAtom);

        if (selectedFeatures.length) {
          e.clipboardData.setData(
            "text/plain",
            JSON.stringify(
              UWrappedFeature.toFeatureCollection(selectedFeatures)
            )
          );
          const { newSelection, moment } = deleteFeatures(get(dataAtom));
          set(selectionAtom, newSelection);
          e.preventDefault();
          void toast.promise(
            transact({
              ...moment,
              track: "cut-features",
            }),
            {
              loading: "Cutting features…",
              error: "Failed to cut features",
              success: "Cut features",
            }
          );
          return;
        }
      },
      [transact]
    )
  );

  const onCopy = useAtomCallback(
    useCallback((get, _set, e: ClipboardEvent) => {
      if (!e.clipboardData || allowNativeCopy(e)) return;

      const selectedFeatures = get(selectedFeaturesAtom);
      const clipboardData = e.clipboardData;

      stringifyFeatures(selectedFeatures).ifJust(({ data, message }) => {
        e.preventDefault();
        clipboardData.setData("text/plain", data);
        toast.success(message);
      });
    }, [])
  );

  const onPaste = useAtomCallback(
    useCallback(
      (get, _set, e: ClipboardEvent) => {
        const data = get(dataAtom);
        if (!e.clipboardData || allowNativePaste(e)) return;
        e.preventDefault();
        const textContent = e.clipboardData.getData("text");
        if (!textContent) return;

        const existingFolderId: string | undefined = match(data.selection)
          .with({ type: "none" }, () => undefined)
          .with({ type: "multi" }, () => {
            const selected = USelection.getSelectedFeatures(data);
            return selected[0]?.folderId || undefined;
          })
          .with({ type: "single" }, () => {
            const selected = USelection.getSelectedFeatures(data);
            return selected[0]?.folderId || undefined;
          })
          /**
           * A folder is selected. Put features in it.
           */
          .with({ type: "folder" }, (sel) => sel.id)
          .exhaustive();

        void importString(
          textContent,
          {
            ...DEFAULT_IMPORT_OPTIONS,
            type: "geojson",
          },
          Comlink.proxy(() => {}),
          "Imported text",
          existingFolderId
        ).then((result) => {
          return result.caseOf({
            Left(err) {
              toast.error(
                `Tried to import pasted GeoJSON, but: ${err.message}`
              );
              return Promise.resolve();
            },
            Right: async (result) => {
              toast.success("Pasted features onto map");
              const extent = getExtent(flattenResult(await result));
              return zoomTo(extent);
            },
          });
        });
      },
      [importString, zoomTo]
    )
  );

  useEffect(() => {
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCut);
    document.addEventListener("paste", onPaste);

    return () => {
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCut);
      document.removeEventListener("paste", onPaste);
    };
  }, [onCopy, onCut, onPaste]);
}
