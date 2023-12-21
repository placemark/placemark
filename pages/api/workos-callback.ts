import { workos } from "integrations/workos";
import { env } from "app/lib/env_server";
import db from "db";
import { INSERTED_USER_SELECT } from "app/auth/mutations/signup";
import { z } from "zod";
import { logger } from "integrations/log";
import { errorUrl } from "app/lib/constants";
import { api } from "app/blitz-server";
import { SSOError } from "app/lib/errors";

const Code = z
  .object({
    code: z.string(),
  })
  .passthrough();

/**
 * @param code The code that WorkOS includes as a query
 * string argument
 */
export async function workOsCallbackInner(code: string) {
  if (!workos) return null;
  /**
   * We get the profile from WorkOS. This should give us
   * the information to find a user (profile.id)
   * and its organization (profile.organization_id)
   */
  const { profile } = await workos.sso.getProfileAndToken({
    code,
    clientID: env.WORKOS_CLIENT_ID,
  });

  if (!profile.organization_id) {
    logger.error(
      "Encountered a WorkOS profile that did not have an organization_id.",
      {
        code,
      }
    );
    throw new SSOError("SSO_ORGANIZATION_NO_ID");
  }

  /**
   * Find the organization in the placemark database
   * that matches the organization in the workos system
   */
  const organization = await db.organization.findFirst({
    where: {
      workOsId: profile.organization_id,
    },
  });

  if (!organization) {
    logger.error(
      "Received SSO callback but the associated organization was missing",
      {
        organization_id: profile.organization_id,
      }
    );
    throw new SSOError("SSO_ORGANIZATION_MISSING");
  }

  let user = await db.user.findFirst({
    select: INSERTED_USER_SELECT,
    where: {
      workOsId: profile.id,
    },
  });

  /**
   * If WorkOS has returned a new profile - a user who
   * has access via Okta to this organization, but doesn't
   * exist in the database, then this will provision
   * that user.
   */
  if (!user) {
    /**
     * First check whether there's a user with
     * that email already in Placemark. If there is,
     * then link their existing account with the workos
     * id. This could probably be more database-efficient,
     * like counting instead of fetching.
     */
    const existingUserWithEmail = await db.user.findFirst({
      select: INSERTED_USER_SELECT,
      where: {
        email: profile.email,
      },
    });

    if (existingUserWithEmail) {
      user = await db.user.update({
        select: INSERTED_USER_SELECT,
        where: {
          email: profile.email,
        },
        data: {
          workOsId: profile.id,
        },
      });
    } else {
      /**
       * Otherwise, provision a new user for the organization.
       */

      logger.info("Automatically provisioning user for organization.", {
        organization_id: profile.organization_id,
        email: profile.email,
      });

      const existingMembershipCount = await db.organization.count({
        where: {
          id: organization.id,
        },
      });

      /**
       * If this is the first user in this organization, make
       * them the owner.
       */
      const role = existingMembershipCount === 0 ? "OWNER" : "USER";

      /**
       * Start with a smart default for a provisioned user’s name
       * based on what WorkOS provides us.
       */
      const name = `${profile.first_name || ""} ${profile.last_name || ""}`;

      /**
       * Automatically provision a new user.
       */
      user = await db.user.create({
        data: {
          email: profile.email,
          name: name,
          hashedPassword: "",
          role: "CUSTOMER",
          workOsId: profile.id,
          memberships: {
            create: {
              /**
               * The first user to join an organization with SSO
               * will be its first owner.
               */
              role: role,
              organization: {
                connect: {
                  id: organization.id,
                },
              },
            },
          },
        },
        select: INSERTED_USER_SELECT,
      });
    }
  }

  return { user, organization };
}

/**
 * Next, let’s add the redirect endpoint which will handle
 * the callback from WorkOS after a user has authenticated
 * with their Identity Provider. This endpoint should
 * exchange the authorization code (valid for 10 minutes)
 * returned by WorkOS with the authenticated user's Profile.
 */
export default api(async function workOSCallback(req, res, ctx) {
  if (!workos) return null;

  const session = ctx.session;
  const { code } = Code.parse(req.query);

  try {
    const r = await workOsCallbackInner(code);
    // Just work with TypeScript here… we know that if
    // WorkOS is disabled, we won't get here, but
    // TypeScript doesn't.
    if (!r) return null;
    const { user, organization } = r;

    await session.$create({
      userId: user.id,
      orgId: organization.id,
      darkMode: user.darkMode,
      coordinateOrder: user.coordinateOrder,
      roles: [user.role, user.memberships[0].role],
    });

    res.redirect("/");
  } catch (e) {
    if (e instanceof SSOError) {
      res.redirect(errorUrl(e.code));
      return;
    }
    throw e;
  }
});
