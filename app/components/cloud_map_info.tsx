import { ArchiveIcon, Link2Icon } from "@radix-ui/react-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as E from "app/components/elements";
import { CLOUD_PROVIDERS } from "app/lib/cloud_providers";
import { buildCloudMapDoc } from "app/lib/cloud_providers/atproto/map_doc";
import {
  setSharedMapUrlParam,
  sharedMapUrl,
} from "app/lib/cloud_providers/atproto/share";
import type { CloudProvider } from "app/lib/cloud_providers/types";
import { truncate, writeToClipboard } from "app/lib/utils";
import { captureException } from "integrations/errors";
import { useAtom, useAtomValue } from "jotai";
import { Tooltip as T } from "radix-ui";
import toast from "react-hot-toast";
import {
  cloudMapAtom,
  dataAtom,
  layerConfigAtom,
  memoryMetaAtom,
} from "state/jotai";

function CloudMapInfoInner({ provider }: { provider: CloudProvider }) {
  const [cloudMap, setCloudMap] = useAtom(cloudMapAtom);
  const authState = provider.useAuthState();
  const data = useAtomValue(dataAtom);
  const layerConfigs = useAtomValue(layerConfigAtom);
  const meta = useAtomValue(memoryMetaAtom);
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!cloudMap) throw new Error("No map to save a new version of");
      const doc = await buildCloudMapDoc(data, layerConfigs, meta);
      return provider.updateMap(
        cloudMap.rkey,
        doc,
        meta.label ?? cloudMap.name,
      );
    },
    onSuccess: (summary) => {
      setCloudMap((current) =>
        current ? { ...current, name: summary.name } : current,
      );
      if (cloudMap) {
        setSharedMapUrlParam(cloudMap.ownerDid, cloudMap.rkey);
      }
      void queryClient.invalidateQueries({
        queryKey: ["cloud-maps", provider.id],
      });
      toast.success("Saved a new version");
    },
    onError: (error) => {
      captureException(error);
      toast.error("Could not save a new version");
    },
  });

  const shareMutation = useMutation({
    mutationFn: async () => {
      if (!cloudMap) throw new Error("No map to share");
      await writeToClipboard(sharedMapUrl(cloudMap.ownerDid, cloudMap.rkey));
    },
    onSuccess: () => {
      toast.success("Link copied — anyone can use it to open this map");
    },
    onError: (error) => {
      captureException(error);
      toast.error("Could not copy the share link");
    },
  });

  if (!cloudMap) return <div></div>;

  const isOwner =
    authState.status === "signed-in" && authState.did === cloudMap.ownerDid;

  return (
    <div className="pl-3 flex-initial hidden sm:flex items-center gap-x-1">
      <ArchiveIcon className="w-3 h-3" />
      <div
        className="text-xs font-mono whitespace-nowrap truncate"
        title={`Loaded from ${provider.label}: ${cloudMap.name}`}
      >
        {truncate(cloudMap.name, 18)}
      </div>
      <T.Root>
        <T.Trigger asChild>
          <button
            type="button"
            aria-label="Copy share link"
            className="text-gray-500 hover:text-black dark:hover:text-white disabled:opacity-50"
            disabled={shareMutation.isPending}
            onClick={() => shareMutation.mutate()}
          >
            <Link2Icon className="w-3 h-3" />
          </button>
        </T.Trigger>
        <E.TContent>Copy share link</E.TContent>
      </T.Root>
      {isOwner ? (
        <E.Button
          size="xs"
          variant="primary"
          aria-label="Save a new version"
          title="Save a new version"
          disabled={updateMutation.isPending}
          onClick={() => updateMutation.mutate()}
        >
          Save
        </E.Button>
      ) : null}
    </div>
  );
}

export function CloudMapInfo() {
  const provider = CLOUD_PROVIDERS[0];
  if (!provider) return <div></div>;
  return <CloudMapInfoInner provider={provider} />;
}
