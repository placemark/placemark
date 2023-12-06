import { useCallback } from "react";
import { useSetAtom } from "jotai";
import { dialogAtom } from "state/jotai";
import { groupFiles } from "app/lib/group_files";
import { useQuery } from "react-query";
import * as Sentry from "@sentry/nextjs";

export function useOpenFiles() {
  const setDialogState = useSetAtom(dialogAtom);

  const { data: fsAccess } = useQuery("browser-fs-access", async () => {
    return import("browser-fs-access");
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
        Sentry.captureException(e);
      });
  }, [setDialogState, fsAccess]);
}
