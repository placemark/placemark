import { z } from "zod";

export const name = z.string().max(256).min(1);
export const email = z
  .string()
  .email()
  .min(1)
  .transform((str) => str.toLowerCase().trim());
export const invitationToken = z.string().min(21);
export const password = z.string().min(10).max(100);

export function assert(condition: any, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
