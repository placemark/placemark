import { SecurePassword } from "@blitzjs/auth/secure-password";
import { resolver } from "@blitzjs/rpc";
import db from "db";
import { Prisma } from "@prisma/client";
import { SignupWithInvite } from "app/auth/validations";
import { updateQuantityForOrganization } from "integrations/stripe";
import { createSession } from "app/core/utils";
import { INSERTED_USER_SELECT } from "./signup";
import { AuthorizationError, NotFoundError } from "blitz";

export default resolver.pipe(
  resolver.zod(SignupWithInvite),
  async ({ email: rawEmail, password, invitationToken }, ctx) => {
    if (ctx.session.$isAuthorized()) {
      throw new AuthorizationError(
        "You’re already logged in, please accept this invitation instead of signing up."
      );
    }

    const hashedPassword = await SecurePassword.hash(password.trim());
    const email = rawEmail.toLowerCase().trim();

    try {
      const membership = await db.membership.update({
        data: {
          invitedEmail: null,
          invitedName: null,
          invitationToken: null,
          role: "USER",
          user: {
            create: {
              email,
              hashedPassword,
              role: "CUSTOMER",
            },
          },
        },
        where: {
          invitationToken: invitationToken,
        },
        select: {
          organizationId: true,
          user: { select: INSERTED_USER_SELECT },
        },
      });

      if (!membership) throw new NotFoundError();

      await createSession(membership.user!, ctx);

      await updateQuantityForOrganization(membership.organizationId);

      return true;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        // The .code property can be accessed in a type-safe manner
        if (e.code === "P2002") {
          throw new AuthorizationError(
            "You can’t accept this invite. You may already be a member of the organization, or have an account."
          );
        }
      }
      throw e;
    }
  }
);
