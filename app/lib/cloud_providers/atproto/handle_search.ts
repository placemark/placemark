import { z } from "zod";

/**
 * Public, unauthenticated, CORS-enabled atproto actor search. Resolves
 * any atproto handle regardless of which PDS it's hosted on.
 * Docs: https://typeahead.waow.tech/docs
 */
const TYPEAHEAD_URL = "https://typeahead.waow.tech/xrpc/tech.waow.typeahead.searchActors";

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
  const response = await fetch(`${TYPEAHEAD_URL}?${params}`, {
    signal,
    headers: { "X-Client": "placemark.io" },
  });
  if (!response.ok) return [];

  return ActorTypeahead.parse(await response.json()).actors;
}
