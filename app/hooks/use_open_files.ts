import { useQuery } from "@tanstack/react-query";
import { groupFiles } from "app/lib/group_files";
import { captureException } from "integrations/errors";
import { useSetAtom } from "jotai";
import { useCallback } from "react";
import { dialogAtom } from "state/jotai";

export function useOpenFiles() {
  const setDialogState = useSetAtom(dialogAtom);

  const { data: fsAccess } = useQuery({
    queryKey: ["browser-fs-access"],
    queryFn: async () => {
      return import("browser-fs-access");
    },
  });

  return useCallback(() => {
    if (!fsAccess) throw new Error("Sorry, still loading");
    return fsAccess
      .fileOpen({ multiple: true, description: "Open files…" })
      .then((f) => {
        const files = groupFiles(f);
        setDialogState({
          type: "import",
          files,
        });
      })
      .catch((e) => {
        captureException(e);
      });
  }, [setDialogState, fsAccess]);
}
