import { z } from "zod";
import { name, password, email, invitationToken } from "app/core/utils";
import { LengthUnit, AreaUnit } from "@prisma/client";

export const Signup = z.object({
  email,
  name,
  organizationName: z.string().max(256),
  password,
});

export const SignupWithInviteLoggedIn = z.object({
  invitationToken,
});

export const SignupWithInvite = z.object({
  email,
  password,
  invitationToken,
});

export const Signin = z.object({
  email,
  password,
});

export const SigninSaml = z.object({
  email,
});

export const SwitchOrganization = z.object({
  id: z.number(),
});

export const UpdateUserOptions = z.object({
  name: z.optional(name),
  darkMode: z.optional(z.boolean()),
  lengthUnits: z.optional(z.nativeEnum(LengthUnit)),
  areaUnits: z.optional(z.nativeEnum(AreaUnit)),
  onboardDocumentationHighlights: z.optional(z.boolean()),
  coordinateOrder: z.optional(z.enum(["LONLAT", "LATLON"])),
});

export const ForgotPassword = z.object({
  email,
});

export const UpdateLastPosition = z.object({
  longitude: z.number(),
  latitude: z.number(),
  zoom: z.number(),
});

export const ChangeEmail = z
  .object({
    currentEmail: email,
    newEmail: email,
  })
  .refine((data) => data.newEmail !== data.currentEmail, {
    message: "Old and new email addresses must be different.",
    path: ["newEmail"], // set the path of the error
  });

export const ResetPassword = z
  .object({
    password: password,
    passwordConfirmation: password,
    token: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: "Passwords don't match",
    path: ["passwordConfirmation"], // set the path of the error
  });

export const ChangePassword = z.object({
  currentPassword: password,
  newPassword: password,
});

export const WalkthroughEvent = z.object({
  type: z.enum(["next", "exit", "restart"]),
});
