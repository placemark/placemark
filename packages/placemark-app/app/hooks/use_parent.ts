import { z } from "zod";
import { safeParseMaybe } from "app/lib/utils";
import { useRouterQuery } from "@blitzjs/next";

const Parent = z.object({
  parent: z.string().nullable(),
});

export function useParent() {
  const { parent } = safeParseMaybe(
    Parent.safeParse(useRouterQuery())
  ).orDefault({ parent: null });
  return parent;
}
