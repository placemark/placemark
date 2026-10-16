/**
 * Share links for cloud-stored maps: the write side (building a URL from
 * a saved map) and the read side (loading `?map=` links at boot, signed
 * in or not). atproto repo reads are public protocol operations, so a
 * (did, rkey) pair is all a recipient needs.
 *
 * Kept free of runtime imports (types only, no Effect RPC) so that this
 * module — statically imported by placemark_play.tsx — adds nothing to
 * builds with VITE_ATPROTO_PERSISTENCE_URL unset, where the env-guarded
 * body is dead code. Same tree-shaking contract as cloud_providers/index.ts.
 */

/**
 * The provider prefix of a share URL's `?map=` parameter. A share link
 * points at a cloud-stored map the way `?load=` points at a file, and
 * carries the provider id so other future providers (Dropbox, GitHub)
 * can share the same parameter.
 */
const PROVIDER = "atproto";

/**
 * Builds the URL that opens a cloud-saved map for anyone. The link
 * targets this app's own origin with a query parameter (rather than a
 * path) so it works regardless of how the SPA is hosted.
 */
export function sharedMapUrl(did: string, rkey: string): string {
  return `${window.location.origin}/?map=${PROVIDER}/${encodeURIComponent(did)}/${encodeURIComponent(rkey)}`;
}

export interface SharedMapRef {
  did: string;
  rkey: string;
}

/** Parses the `?map=` parameter, or null when it isn't a share link. */
export function parseSharedMapParam(param: string | null): SharedMapRef | null {
  if (!param) return null;
  const [provider, did, rkey] = param.split("/");
  if (provider !== PROVIDER || !did || !rkey) return null;
  return { did, rkey };
}

export interface SharedMapResponse {
  name: string;
  doc: {
    dataBase64: string;
    symbolization: unknown;
    layer: unknown;
    folders: unknown;
    layerConfigs: unknown;
  };
}

/**
 * Fetches a shared map from the persistence worker's public endpoint.
 * No sign-in involved, on either side.
 */
export async function fetchSharedMap(
  ref: SharedMapRef,
): Promise<SharedMapResponse> {
  const baseUrl = import.meta.env.VITE_ATPROTO_PERSISTENCE_URL;
  if (!baseUrl) {
    throw new Error("Cloud maps are not configured in this build");
  }
  const url = `${baseUrl}/public/map?did=${encodeURIComponent(ref.did)}&rkey=${encodeURIComponent(ref.rkey)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      response.status === 404
        ? "That shared map doesn't exist (it may have been deleted)."
        : `Could not fetch the shared map (${response.status}).`,
    );
  }
  const data: unknown = await response.json();
  if (
    typeof data !== "object" ||
    data === null ||
    !("name" in data) ||
    typeof data.name !== "string" ||
    !("doc" in data) ||
    typeof data.doc !== "object" ||
    data.doc === null ||
    !("dataBase64" in data.doc) ||
    typeof data.doc.dataBase64 !== "string"
  ) {
    throw new Error("The shared map response was malformed.");
  }
  // Folder/layer/symbolization fields get Zod-validated downstream by
  // load_into_editor, same as they are for signed-in loads.
  return data as unknown as SharedMapResponse;
}
