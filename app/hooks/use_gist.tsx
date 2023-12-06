import { useCallback } from "react";
import getGitHubStatus from "app/users/queries/getGitHubStatus";
import { invoke, useMutation } from "@blitzjs/rpc";
import { useSetAtom } from "jotai";
import { dialogAtom } from "state/dialog_state";
import gistWrappedFeatureCollection from "app/wrappedFeatureCollections/mutations/gistWrappedFeatureCollection";
import { usePersistence } from "app/lib/persistence/context";
import toast from "react-hot-toast";
import { styledButton } from "app/components/elements";
import { ExternalLinkIcon } from "@radix-ui/react-icons";
import { writeToClipboard } from "app/lib/utils";

export function useGist() {
  const rep = usePersistence();
  const [meta] = rep.useMetadata();
  const [createGist] = useMutation(gistWrappedFeatureCollection);
  const setDialog = useSetAtom(dialogAtom);

  return useCallback(
    async ({ saveAs }: { saveAs: boolean } = { saveAs: false }) => {
      if (meta.type !== "persisted") {
        return toast.error("Only saved maps can be shared as Gists");
      }

      const githubStatus = await invoke(getGitHubStatus, {});

      if (!githubStatus) {
        return setDialog({ type: "gist" });
      }

      await toast.promise(
        createGist({
          id: meta.id,
          saveAs,
        }).then(async (url) => {
          await writeToClipboard(url);
          return url;
        }),
        {
          loading: "Creating Gist",
          error: "Failed to share as Gist",
          success: (url) => (
            <div className="items-center flex gap-x-2">
              Gist URL copied
              <a
                className={styledButton({})}
                rel="noreferrer"
                href={url}
                target="_blank"
              >
                Open
                <ExternalLinkIcon />
              </a>
            </div>
          ),
        }
      );
    },
    [setDialog, createGist, meta]
  );
}
