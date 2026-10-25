import { useQuery } from "@tanstack/react-query";
import { Effect, Layer } from "effect";
import { FetchHttpClient } from "effect/http";
import {
  RpcClient,
  type RpcClientError,
  type RpcGroup,
  RpcSerialization,
} from "effect/rpc";
import { MapRpcs } from "shared/atproto_rpc";
import {
  type CloudAuthState,
  type CloudMapDocument,
  type CloudMapSummary,
  type CloudProvider,
} from "../types";

type MapRpcClient = RpcClient.RpcClient<
  RpcGroup.Rpcs<typeof MapRpcs>,
  RpcClientError.RpcClientError
>;

function makeClientLayer(baseUrl: string) {
  return RpcClient.layerProtocolHttp({ url: `${baseUrl}/rpc` }).pipe(
    // provideMerge, not provide: FetchHttpClient's fetch implementation
    // reads RequestInit from the ambient context at request time, not at
    // this layer's construction time -- plain `provide` discards it from
    // the exposed context once built, silently dropping `credentials:
    // "include"` and falling back to the browser's "same-origin" default.
    Layer.provideMerge(
      Layer.mergeAll(
        FetchHttpClient.layer,
        Layer.succeed(
          FetchHttpClient.RequestInit,
          FetchHttpClient.RequestInit.of({ credentials: "include" }),
        ),
      ),
    ),
    Layer.provide(RpcSerialization.layerJson),
  );
}

function runRpc<A, E>(
  baseUrl: string,
  call: (client: MapRpcClient) => Effect.Effect<A, E>,
): Promise<A> {
  return Effect.runPromise(
    Effect.gen(function* () {
      const client = yield* RpcClient.make(MapRpcs);
      return yield* call(client);
    }).pipe(Effect.scoped, Effect.provide(makeClientLayer(baseUrl))),
  );
}

async function isSignedIn(baseUrl: string): Promise<boolean> {
  try {
    await runRpc(baseUrl, (client) => client.Me());
    return true;
  } catch {
    return false;
  }
}

// The name shared by `window.open` and the login form's `target`, which
// is what routes the login POST into the popup instead of this tab.
const POPUP_NAME = "placemark-oauth";

function readPopupMessage(
  data: unknown,
): { type: string; message?: string } | null {
  if (typeof data !== "object" || data === null || !("type" in data)) {
    return null;
  }
  const type = data.type;
  if (typeof type !== "string") {
    return null;
  }
  const message =
    "message" in data && typeof data.message === "string"
      ? data.message
      : undefined;
  return { type, message };
}

const PROVIDER_ID = "atproto";

export function atprotoProvider(baseUrl: string): CloudProvider {
  const workerOrigin = new URL(baseUrl).origin;

  return {
    id: PROVIDER_ID,
    label: "Atmosphere",

    useAuthState(): CloudAuthState {
      // ["cloud-auth", id] is a convention, not a shared symbol -- any
      // caller can derive the same key from provider.id to invalidate it.
      const query = useQuery({
        queryKey: ["cloud-auth", PROVIDER_ID],
        queryFn: async (): Promise<CloudAuthState> => {
          try {
            const me = await runRpc(baseUrl, (client) => client.Me());
            return { status: "signed-in", handle: me.handle, did: me.did };
          } catch {
            return { status: "signed-out" };
          }
        },
      });

      return query.data ?? { status: "signed-out" };
    },

    signIn(handle: string): Promise<void> {
      return new Promise<void>((resolve, reject) => {
        // Runs in a popup so the main tab (and the in-memory map) is
        // never navigated away. window.open must stay synchronous (no
        // await before it) to run inside the click's user activation.
        const width = 500;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        const popup = window.open(
          "",
          POPUP_NAME,
          `width=${width},height=${height},left=${left},top=${top}`,
        );
        if (!popup) {
          reject(
            new Error("Popup blocked — please allow popups for this site."),
          );
          return;
        }

        // The popup's callback page posts its result then closes itself,
        // but that channel isn't reliable: once the popup navigates to
        // the identity provider's authorization page, a
        // Cross-Origin-Opener-Policy header there (common on auth
        // providers) severs this window's relationship to the opener.
        // That breaks things in both directions -- `popup.closed` reads
        // `true` on our side from then on even while the popup is still
        // open (so it can't be used to detect cancellation), and
        // `window.opener` can go null on the popup's side, silently
        // dropping its postMessage even on a successful sign-in.
        //
        // So postMessage is only a fast path here. The authoritative
        // signal is polling our own session status, which only depends
        // on the cookie the callback response sets -- unaffected by any
        // of the above, since it isn't delivered via a window reference.
        let settled = false;

        function cleanup() {
          window.removeEventListener("message", onMessage);
          clearInterval(pollTimer);
          clearTimeout(timeoutTimer);
        }

        function finish(fn: () => void) {
          if (settled) return;
          settled = true;
          cleanup();
          popup?.close();
          fn();
        }

        // `popup?.` rather than `popup.`: TypeScript doesn't carry the
        // null check above into a hoisted function declaration.
        function onMessage(event: MessageEvent) {
          // Only the worker that served the callback page may report an
          // outcome.
          if (event.origin !== workerOrigin) return;
          const message = readPopupMessage(event.data);
          if (!message) return;
          if (message.type === "placemark-oauth-complete") {
            finish(resolve);
          } else if (message.type === "placemark-oauth-error") {
            finish(() => reject(new Error(message.message ?? "Sign-in failed")));
          }
        }
        window.addEventListener("message", onMessage);

        const pollTimer = setInterval(() => {
          void isSignedIn(baseUrl).then((signedIn) => {
            if (signedIn) finish(resolve);
          });
        }, 1500);

        // A decline or failure can be just as silent as a success if
        // postMessage is blocked, so this is what keeps that case from
        // spinning forever instead of surfacing an error.
        const timeoutTimer = setTimeout(() => {
          finish(() =>
            reject(new Error("Sign-in timed out. Please try again.")),
          );
        }, 120_000);

        const form = document.createElement("form");
        form.method = "POST";
        form.action = `${baseUrl}/oauth/login`;
        form.target = POPUP_NAME;
        form.style.display = "none";

        const input = document.createElement("input");
        input.type = "hidden";
        input.name = "handle";
        input.value = handle;

        form.appendChild(input);
        document.body.appendChild(form);
        form.submit();
        form.remove();
      });
    },

    async signOut() {
      // A plain fetch, not an RPC call: logout needs to clear a
      // Set-Cookie response header, which the RPC client has no path for.
      const response = await fetch(`${baseUrl}/oauth/logout`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Could not sign out");
      }
    },

    async listMaps(): Promise<CloudMapSummary[]> {
      const maps = await runRpc(baseUrl, (client) => client.ListMaps());
      return [...maps];
    },

    async saveMap(
      doc: CloudMapDocument,
      name: string,
    ): Promise<CloudMapSummary> {
      return runRpc(baseUrl, (client) => client.SaveMap({ name, doc }));
    },

    async loadMap(rkey: string): Promise<CloudMapDocument> {
      return runRpc(baseUrl, (client) => client.LoadMap({ rkey }));
    },

    async updateMap(
      rkey: string,
      doc: CloudMapDocument,
      name?: string,
    ): Promise<CloudMapSummary> {
      return runRpc(baseUrl, (client) => client.UpdateMap({ rkey, name, doc }));
    },

    async deleteMap(rkey: string): Promise<void> {
      await runRpc(baseUrl, (client) => client.DeleteMap({ rkey }));
    },
  };
}
