import { z } from "zod";
import { invitationToken } from "app/core/utils";

export const PauseMemberships = z.object({});

export const DeleteMembership = z.object({
  id: z.number(),
});

export const ChangeRole = z.object({
  id: z.number(),
  role: z.enum(["OWNER", "ADMIN", "USER"]),
});

export const GetInvitation = z.object({
  token: invitationToken,
});

export const AcceptInvite = z.object({
  invitationToken,
});
