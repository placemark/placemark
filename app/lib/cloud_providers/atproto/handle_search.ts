import { z } from "zod";

/**
 * Bluesky's public AppView — unauthenticated, CORS-enabled, and the same
 * endpoint bsky.app's own handle search uses. Any atproto handle can be
 * resolved this way regardless of which app or PDS it's actually hosted
 * on, since the AppView indexes the whole network.
 */
const TYPEAHEAD_URL =
  "https://public.api.bsky.app/xrpc/app.bsky.actor.searchActorsTypeahead";

const ActorTypeahead = z.object({
  actors: z.array(
    z.object({
      did: z.string(),
      handle: z.string(),
      displayName: z.string().optional(),
      avatar: z.string().optional(),
    }),
  ),
});

export type HandleSuggestion = z.infer<typeof ActorTypeahead>["actors"][number];

export async function searchHandles(
  query: string,
  signal?: AbortSignal,
): Promise<HandleSuggestion[]> {
  const q = query.trim().replace(/^@/, "");
  if (!q) return [];

  const params = new URLSearchParams({ q, limit: "8" });
  const response = await fetch(`${TYPEAHEAD_URL}?${params}`, { signal });
  if (!response.ok) return [];

  return ActorTypeahead.parse(await response.json()).actors;
}
