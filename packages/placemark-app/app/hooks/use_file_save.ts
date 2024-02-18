import { dataAtom, fileInfoAtom, fileInfoMachineAtom } from "state/jotai";
import { fromGeoJSON } from "app/lib/convert";
import { EitherAsync } from "purify-ts/EitherAsync";
import type { ConvertError } from "app/lib/errors";
import { useAtomCallback } from "jotai/utils";
import { useCallback } from "react";
import { useSetAtom } from "jotai";

export default function useFileSave() {
  const send = useSetAtom(fileInfoMachineAtom);
  return useAtomCallback(
    useCallback(
      function saveNative(get, set) {
        return EitherAsync<ConvertError, boolean>(
          async function functionSaveNativeInner({ fromPromise }) {
            const { supported, fileSave } = await import("browser-fs-access");
            const fileInfo = get(fileInfoAtom);
            const data = get(dataAtom);
            if (!(fileInfo && supported)) return false;
            return fromPromise(
              fromGeoJSON(data, fileInfo.options).map(async (res) => {
                const newHandle = await fileSave(
                  res.result.blob,
                  {
                    fileName: "map.svg",
                    description: "Save file",
                  },
                  fileInfo.handle as unknown as FileSystemFileHandle,
                  true
                );
                send("show");
                if (newHandle) {
                  set(fileInfoAtom, {
                    handle: newHandle,
                    options: fileInfo.options,
                  });
                }
                return true;
              })
            );
          }
        );
      },
      [send]
    )
  );
}
