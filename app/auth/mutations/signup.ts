import { SecurePassword } from "@blitzjs/auth/secure-password";
import { resolver } from "@blitzjs/rpc";
import db from "db";
import { Signup } from "app/auth/validations";
import { createSession } from "app/core/utils";

export const INSERTED_USER_SELECT = {
  id: true,
  memberships: {
    select: {
      id: true,
      role: true,
      organization: true,
    },
  },
  name: true,
  email: true,
  role: true,
  darkMode: true,
  coordinateOrder: true,
  onboardDocumentationHighlights: true,
  lengthUnits: true,
  areaUnits: true,
  workOsId: true,
} as const;

/**
 * Signing up, stage one. We:
 *
 * - Create a Customer in Stripe
 * - Create a user in the database
 * - Log that user in
 * - Create a checkout session for that user
 * - Return the id of that checkout session so that
 *   the UI can redirect.
 */
export default resolver.pipe(
  resolver.zod(Signup),
  async ({ email: rawEmail, name, organizationName, password }, ctx) => {
    try {
      const hashedPassword = await SecurePassword.hash(password.trim());
      const email = rawEmail.toLowerCase().trim();

      const user = await db.user.create({
        data: {
          email,
          name,
          hashedPassword,
          role: "CUSTOMER",
          memberships: {
            create: {
              role: "OWNER",
              organization: {
                create: {
                  name: organizationName.trim() || "My team",
                },
              },
            },
          },
        },
        select: INSERTED_USER_SELECT,
      });

      await createSession(user, ctx);

      return;
    } catch (e) {
      // eslint-disable-next-line
      console.error(e);
    }
  }
);
