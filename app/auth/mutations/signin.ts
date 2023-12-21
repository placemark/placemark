import { SecurePassword } from "@blitzjs/auth/secure-password";
import { resolver } from "@blitzjs/rpc";
import db from "db";
import { Signin } from "../validations";
import { createSession } from "app/core/utils";
import { AuthenticationError } from "blitz";
import { posthog } from "integrations/posthog";
import { toggleMemberships } from "app/lib/utils_server";

const CREDENTIALS_INVALID = "Sorry, those credentials are invalid.";

export const authenticateUser = async (
  rawEmail: string,
  rawPassword: string
) => {
  const email = rawEmail.toLowerCase().trim();
  const password = rawPassword.trim();
  const user = await db.user.findFirst({
    where: { email },
    include: {
      memberships: {
        select: {
          id: true,
          role: true,
          organization: true,
        },
      },
    },
  });

  if (!user) {
    // Produce the same error for no account versus bad
    // password to prevent this from being an oracle that reveals who
    // has accounts.
    throw new AuthenticationError(CREDENTIALS_INVALID);
  }

  if (user.workOsId) {
    throw new AuthenticationError(
      "Your account authenticates with SSO. Please log in by using the SSO form."
    );
  }

  const result = await SecurePassword.verify(
    user.hashedPassword,
    password
  ).catch(() => {
    throw new AuthenticationError(CREDENTIALS_INVALID);
  });

  if (result === SecurePassword.VALID_NEEDS_REHASH) {
    // Upgrade hashed password with a more secure hash
    const improvedHash = await SecurePassword.hash(password);
    await db.user.update({
      where: { id: user.id },
      data: { hashedPassword: improvedHash },
    });
  }

  /**
   * Make all of this users memberships active
   */
  await toggleMemberships(user.id, "ACTIVE");

  const { hashedPassword, ...rest } = user;

  posthog?.capture({
    distinctId: String(rest.id),
    event: "signin",
  });

  posthog?.identify({
    distinctId: String(rest.id),
    properties: {
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    },
  });

  return rest;
};

export type UserForSession = Omit<
  Awaited<ReturnType<typeof authenticateUser>>,
  "createdAt" | "updatedAt" | "githubToken" | "walkthroughState"
>;

export default resolver.pipe(
  resolver.zod(Signin),
  async ({ email, password }, ctx) => {
    // This throws an error if credentials are invalid
    const user = await authenticateUser(email, password);
    await createSession(user, ctx);
    return user;
  }
);
