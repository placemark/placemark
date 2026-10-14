import { ArchiveIcon, Link2Icon } from "@radix-ui/react-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DialogHeader } from "app/components/dialog";
import * as E from "app/components/elements";
import { CLOUD_PROVIDERS } from "app/lib/cloud_providers";
import { encodeFeaturesToFlatGeobuf } from "app/lib/cloud_providers/atproto/fgb_codec";
import { useLoadCloudMapIntoEditor } from "app/lib/cloud_providers/atproto/load_into_editor";
import { sharedMapUrl } from "app/lib/cloud_providers/atproto/share";
import { writeToClipboard } from "app/lib/utils";
import { captureException } from "integrations/errors";
import { useAtomValue } from "jotai";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { dataAtom, layerConfigAtom, memoryMetaAtom } from "state/jotai";

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export function CloudMapsDialog({ onClose }: { onClose: () => void }) {
  const provider = CLOUD_PROVIDERS[0];
  const data = useAtomValue(dataAtom);
  const layerConfigs = useAtomValue(layerConfigAtom);
  const meta = useAtomValue(memoryMetaAtom);
  const loadIntoEditor = useLoadCloudMapIntoEditor();
  const queryClient = useQueryClient();
  // Share links are addressed by the owner's DID, which only `Me` knows.
  const authState = provider.useAuthState();

  const [saveName, setSaveName] = useState(meta.label ?? "");

  const mapsQuery = useQuery({
    queryKey: ["cloud-maps", provider.id],
    queryFn: () => provider.listMaps(),
  });

  useEffect(() => {
    if (mapsQuery.error) {
      captureException(mapsQuery.error);
      toast.error("Could not load your maps");
    }
  }, [mapsQuery.error]);

  const saveMutation = useMutation({
    mutationFn: async (name: string) => {
      const bytes = await encodeFeaturesToFlatGeobuf(
        Array.from(data.featureMap.values()),
      );
      const doc = {
        dataBase64: toBase64(bytes),
        symbolization: meta.symbolization,
        layer: meta.layer,
        folders: Array.from(data.folderMap.values()),
        layerConfigs: Array.from(layerConfigs.values()),
      };
      return provider.saveMap(doc, name);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["cloud-maps", provider.id],
      });
      toast.success("Saved");
    },
    onError: (error) => {
      captureException(error);
      toast.error("Could not save the map");
    },
  });

  const openMutation = useMutation({
    mutationFn: async (rkey: string) => {
      const doc = await provider.loadMap(rkey);
      const summary = mapsQuery.data?.find((map) => map.rkey === rkey);
      await loadIntoEditor(doc, summary?.name ?? "Untitled map");
    },
    onSuccess: () => {
      toast.success("Opened");
      onClose();
    },
    onError: (error) => {
      captureException(error);
      toast.error("Could not open the map");
    },
  });

  const shareMutation = useMutation({
    mutationFn: async (rkey: string) => {
      const did = authState.did;
      if (!did) throw new Error("Not signed in");
      await writeToClipboard(sharedMapUrl(did, rkey));
    },
    onSuccess: () => {
      toast.success("Link copied — anyone can use it to open this map");
    },
    onError: (error) => {
      captureException(error);
      toast.error("Could not copy the share link");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (rkey: string) => provider.deleteMap(rkey),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["cloud-maps", provider.id],
      });
    },
    onError: (error) => {
      captureException(error);
      toast.error("Could not delete the map");
    },
  });

  const maps = mapsQuery.data ?? [];

  return (
    <>
      <DialogHeader title="My maps" titleIcon={ArchiveIcon} />
      <div className="space-y-4">
        <div className="flex gap-x-2">
          <E.Input
            _size="sm"
            value={saveName}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setSaveName(event.target.value)
            }
            placeholder="Map name"
          />
          <E.Button
            variant="primary"
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate(saveName || "Untitled map")}
          >
            Save current map
          </E.Button>
        </div>
        {mapsQuery.isLoading ? (
          <E.TextWell>Loading…</E.TextWell>
        ) : maps.length === 0 ? (
          <E.TextWell>No saved maps yet.</E.TextWell>
        ) : (
          <ul className="space-y-1">
            {maps.map((map) => (
              <li
                key={map.rkey}
                className="flex items-center justify-between gap-x-2"
              >
                <button
                  type="button"
                  className="text-left underline"
                  onClick={() => openMutation.mutate(map.rkey)}
                >
                  {map.name}
                </button>
                <div className="flex items-center gap-x-1">
                  <E.Button
                    size="xs"
                    aria-label="Copy share link"
                    disabled={!authState.did || shareMutation.isPending}
                    onClick={() => shareMutation.mutate(map.rkey)}
                  >
                    <Link2Icon />
                  </E.Button>
                  <E.Button
                    size="xs"
                    variant="destructive"
                    onClick={() => deleteMutation.mutate(map.rkey)}
                  >
                    Delete
                  </E.Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
