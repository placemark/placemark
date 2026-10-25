import { ArchiveIcon } from "@radix-ui/react-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DialogHeader } from "app/components/dialog";
import * as E from "app/components/elements";
import { CLOUD_PROVIDERS } from "app/lib/cloud_providers";
import { buildCloudMapDoc } from "app/lib/cloud_providers/atproto/map_doc";
import { setSharedMapUrlParam } from "app/lib/cloud_providers/atproto/share";
import { captureException } from "integrations/errors";
import { useAtomValue, useSetAtom } from "jotai";
import { useState } from "react";
import toast from "react-hot-toast";
import {
  cloudMapAtom,
  dataAtom,
  layerConfigAtom,
  memoryMetaAtom,
} from "state/jotai";

export function CloudSaveMapDialog({ onClose }: { onClose: () => void }) {
  const provider = CLOUD_PROVIDERS[0];
  const data = useAtomValue(dataAtom);
  const layerConfigs = useAtomValue(layerConfigAtom);
  const meta = useAtomValue(memoryMetaAtom);
  const setCloudMap = useSetAtom(cloudMapAtom);
  const authState = provider.useAuthState();
  const queryClient = useQueryClient();

  const [saveName, setSaveName] = useState(meta.label ?? "");

  const saveMutation = useMutation({
    mutationFn: async (name: string) => {
      const doc = await buildCloudMapDoc(data, layerConfigs, meta);
      return provider.saveMap(doc, name);
    },
    onSuccess: (summary) => {
      void queryClient.invalidateQueries({
        queryKey: ["cloud-maps", provider.id],
      });
      if (authState.did) {
        setCloudMap({
          providerId: provider.id,
          rkey: summary.rkey,
          ownerDid: authState.did,
          name: summary.name,
        });
        setSharedMapUrlParam(authState.did, summary.rkey);
      }
      toast.success("Saved");
      onClose();
    },
    onError: (error) => {
      captureException(error);
      toast.error("Could not save the map");
    },
  });

  return (
    <>
      <DialogHeader title="Save current map" titleIcon={ArchiveIcon} />
      <form
        className="flex gap-x-2"
        onSubmit={(event) => {
          event.preventDefault();
          saveMutation.mutate(saveName || "Untitled map");
        }}
      >
        <E.Input
          _size="sm"
          autoFocus
          className="min-w-0 flex-1"
          value={saveName}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            setSaveName(event.target.value)
          }
          placeholder="Map name"
        />
        <E.Button
          type="submit"
          variant="primary"
          className="shrink-0 whitespace-nowrap"
          disabled={saveMutation.isPending}
        >
          Save
        </E.Button>
      </form>
    </>
  );
}
