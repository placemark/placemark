import { PersonIcon, Share1Icon } from "@radix-ui/react-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as E from "app/components/elements";
import { CLOUD_PROVIDERS } from "app/lib/cloud_providers";
import type { CloudProvider } from "app/lib/cloud_providers/types";
import { captureException } from "integrations/errors";
import { useSetAtom } from "jotai";
import { DropdownMenu as DD, Tooltip as T } from "radix-ui";
import toast from "react-hot-toast";
import { dialogAtom } from "state/jotai";

function BlueskyIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="currentColor"
      {...props}
    >
      <path d="M3.468 1.948C5.303 3.325 7.276 6.118 8 7.616c.725-1.498 2.697-4.291 4.532-5.668C13.855.955 16 .186 16 2.632c0 .489-.28 4.105-.444 4.692-.572 2.04-2.653 2.561-4.504 2.246 3.236.551 4.06 2.375 2.281 4.2-3.376 3.464-4.852-.87-5.23-1.98-.07-.204-.103-.3-.103-.218 0-.081-.033.014-.103.218-.379 1.11-1.855 5.444-5.231 1.98-1.778-1.825-.954-3.65 2.283-4.2-1.853.315-3.934-.205-4.506-2.246C.28 6.737 0 3.12 0 2.633 0 .186 2.145.955 3.468 1.948Z" />
    </svg>
  );
}

function useAtmosphereAvatar(did: string | undefined) {
  return useQuery({
    queryKey: ["atmosphere-avatar", did],
    queryFn: async (): Promise<string | null> => {
      const response = await fetch(
        `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(did ?? "")}`,
      );
      if (!response.ok) throw new Error("profile fetch failed");
      const data: unknown = await response.json();
      if (
        typeof data === "object" &&
        data !== null &&
        "avatar" in data &&
        typeof data.avatar === "string"
      ) {
        return data.avatar;
      }
      return null;
    },
    enabled: !!did,
    staleTime: 60 * 60 * 1000,
    retry: false,
  });
}

function SignedOut({ provider }: { provider: CloudProvider }) {
  const setDialogState = useSetAtom(dialogAtom);
  return (
    <T.Root>
      <T.Trigger asChild>
        <E.Button
          variant="quiet"
          aria-label={`Sign in with ${provider.label}`}
          onClick={() => setDialogState({ type: "cloud_sign_in" })}
        >
          <Share1Icon className="w-3.5 h-3.5" />
          <BlueskyIcon />
        </E.Button>
      </T.Trigger>
      <E.TContent>Sign in with {provider.label}</E.TContent>
    </T.Root>
  );
}

function SignedIn({
  provider,
  handle,
  did,
}: {
  provider: CloudProvider;
  handle: string;
  did: string;
}) {
  const setDialogState = useSetAtom(dialogAtom);
  const queryClient = useQueryClient();
  const avatarQuery = useAtmosphereAvatar(did);

  const signOutMutation = useMutation({
    mutationFn: () => provider.signOut(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["cloud-auth", provider.id],
      });
      toast.success(`Signed out of ${provider.label}`);
    },
    onError: (error) => {
      captureException(error);
      toast.error("Could not sign out");
    },
  });

  return (
    <DD.Root>
      <T.Root>
        <T.Trigger asChild>
          <DD.Trigger asChild>
            <button
              type="button"
              aria-label={`@${handle}`}
              className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center shrink-0
                bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-300"
            >
              {avatarQuery.data ? (
                <img
                  src={avatarQuery.data}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <PersonIcon />
              )}
            </button>
          </DD.Trigger>
        </T.Trigger>
        <E.TContent>@{handle}</E.TContent>
      </T.Root>
      <DD.Portal>
        <E.DDContent>
          <E.DDLabel>@{handle}</E.DDLabel>
          <E.StyledItem onSelect={() => signOutMutation.mutate()}>
            Sign out
          </E.StyledItem>
          <E.DDSeparator />
          <E.StyledItem
            onSelect={() => setDialogState({ type: "cloud_save_map" })}
          >
            Save current map
          </E.StyledItem>
          <E.StyledItem onSelect={() => setDialogState({ type: "cloud_maps" })}>
            Open map…
          </E.StyledItem>
        </E.DDContent>
      </DD.Portal>
    </DD.Root>
  );
}

function AtmosphereIdentityInner({ provider }: { provider: CloudProvider }) {
  const authState = provider.useAuthState();

  if (authState.status === "signed-in" && authState.did) {
    return (
      <SignedIn
        provider={provider}
        handle={authState.handle ?? authState.did}
        did={authState.did}
      />
    );
  }

  if (authState.status === "signed-out") {
    return <SignedOut provider={provider} />;
  }

  return null;
}

export function AtmosphereIdentity() {
  const provider = CLOUD_PROVIDERS[0];
  if (!provider) return null;
  return <AtmosphereIdentityInner provider={provider} />;
}
