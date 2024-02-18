import { z } from "zod";

export const Provision = z.object({
  id: z.number(),
  domain: z.string(),
});
