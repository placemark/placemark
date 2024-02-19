import type { Ctx } from "blitz";
import type { Prisma } from "@prisma/client";
import { GlobalRole } from "@prisma/client";
import type { UserForSession } from "app/auth/mutations/signin";
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

/**
 * When a user signs in, signs up, or accepts an invitation,
 * this is the method that creates their initial session,
 * essentially 'logging them in'
 */
export async function createSession(user: UserForSession, ctx: Ctx) {
  const firstMembership = user.memberships[0];

  const shared = {
    userId: user.id,
    darkMode: user.darkMode,
    coordinateOrder: user.coordinateOrder,
  } as const;

  if (!firstMembership) {
    return await ctx.session.$create({
      ...shared,
      roles: [user.role],
    });
  }

  return await ctx.session.$create({
    ...shared,
    roles: [user.role, user.memberships[0].role],
    orgId: user.memberships[0].organization.id,
  });
}

export const setDefaultOrganizationId = <T extends Record<any, any>>(
  input: T,
  { session }: Ctx
): T & { organizationId: Prisma.IntNullableFilter | number } => {
  assert(session.orgId, "Missing session.orgId in setDefaultOrganizationId");
  if (input.organizationId) {
    // Pass through the input
    return input as T & { organizationId: number };
  } else if (session.roles?.includes(GlobalRole.SUPERADMIN)) {
    // Allow viewing any organization
    return { ...input, organizationId: { not: 0 } };
  } else {
    // Set organizationId to session.orgId
    return { ...input, organizationId: session.orgId };
  }
};
