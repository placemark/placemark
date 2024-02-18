import { z } from "zod";
import { name } from "app/core/utils";
import addrs from "email-addresses";

export const GetOrganization = z.object({
  // This accepts type of undefined, but is required at runtime
  id: z.number().optional().refine(Boolean, "Required"),
});

export const ChangeCoupon = z.object({
  code: z.string().trim().nullable(),
});

export const CreateOrganization = z.object({
  name,
});

export const Name = z.object({
  name,
  id: z.number(),
});

export const Invite = z.object({
  emails: z
    .string()
    .min(1)
    .refine(
      (val) => {
        return addrs.parseAddressList(val) !== null;
      },
      {
        message: "Invalid email address list",
      }
    ),
});

export const CancelInvite = z.object({
  id: z.number(),
});
