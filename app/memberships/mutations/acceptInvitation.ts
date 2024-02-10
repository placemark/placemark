import { resolver } from "@blitzjs/rpc";
import { Prisma } from "@prisma/client";
import db from "db";
import { updateSession } from "app/core/updateSession";
import { AcceptInvite } from "app/memberships/validations";
import { AuthorizationError } from "blitz";

export default resolver.pipe(
  resolver.zod(AcceptInvite),
  resolver.authorize(),
  async ({ invitationToken }, ctx) => {
    try {
      // Make the current user a member of the organization
      // attached to `invitationToken`
      const membership = await db.membership.update({
        data: {
          invitedEmail: null,
          invitedName: null,
          invitationToken: null,
          role: "USER",
          userId: ctx.session.userId,
        },
        include: {
          organization: true,
          user: true,
        },
        where: {
          invitationToken: invitationToken,
        },
      });

      // Change the user's default organization to this
      // one.
      await updateSession(membership, ctx);

      return true;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        // The .code property can be accessed in a type-safe manner
        switch (e.code) {
          case "P2002": {
            throw new AuthorizationError(
              "You can’t accept this invite. You may already be a member of the organization."
            );
          }
          case "P2025": {
            throw new AuthorizationError(
              "This invitation has already been accepted"
            );
          }
        }
      }
      throw e;
    }
  }
);
