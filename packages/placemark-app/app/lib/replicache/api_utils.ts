import { z } from "zod";

export const Query = z.object({
  wrappedFeatureCollectionId: z.string(),
});

export function pokeURL(wrappedFeatureCollectionId: string) {
  return `/api/poke?id=${wrappedFeatureCollectionId}`;
}
