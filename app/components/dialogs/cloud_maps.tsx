import { ArchiveIcon, Link2Icon } from "@radix-ui/react-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DialogHeader } from "app/components/dialog";
import * as E from "app/components/elements";
import { CLOUD_PROVIDERS } from "app/lib/cloud_providers";
import { useLoadCloudMapIntoEditor } from "app/lib/cloud_providers/atproto/load_into_editor";
import { sharedMapUrl } from "app/lib/cloud_providers/atproto/share";
import { formatDateAgo, writeToClipboard } from "app/lib/utils";
import { captureException } from "integrations/errors";
import { useEffect } from "react";
import toast from "react-hot-toast";

export function CloudMapsDialog({ onClose }: { onClose: () => void }) {
  const provider = CLOUD_PROVIDERS[0];
  const loadIntoEditor = useLoadCloudMapIntoEditor();
  const queryClient = useQueryClient();
  // Share links are addressed by the owner's DID, which only `Me` knows.
  const authState = provider.useAuthState();

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

  const openMutation = useMutation({
    mutationFn: async (rkey: string) => {
      if (!authState.did) throw new Error("Not signed in");
      const doc = await provider.loadMap(rkey);
      const summary = mapsQuery.data?.find((map) => map.rkey === rkey);
      await loadIntoEditor(doc, summary?.name ?? "Untitled map", {
        providerId: provider.id,
        rkey,
        ownerDid: authState.did,
      });
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
      toast.success("Link copied. Anyone can use it to open this map.");
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
      <DialogHeader title="Open map" titleIcon={ArchiveIcon} />
      {mapsQuery.isLoading ? (
        <E.TextWell>Loading…</E.TextWell>
      ) : maps.length === 0 ? (
        <E.TextWell>No saved maps yet.</E.TextWell>
      ) : (
        <ul className="-mx-2 divide-y divide-gray-100 dark:divide-gray-700">
          {maps.map((map) => (
            <li
              key={map.rkey}
              className="flex items-center justify-between gap-x-2 rounded-sm px-2 py-2 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => openMutation.mutate(map.rkey)}
              >
                <div className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                  {map.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Updated {formatDateAgo(new Date(), new Date(map.updatedAt))}
                </div>
              </button>
              <div className="flex shrink-0 items-center gap-x-1">
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
    </>
  );
}
