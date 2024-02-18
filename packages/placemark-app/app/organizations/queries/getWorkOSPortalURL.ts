import { resolver } from "@blitzjs/rpc";
import { workos } from "integrations/workos";
import db from "db";
import { GeneratePortalLinkIntent } from "@workos-inc/node";
import { NotFoundError } from "blitz";

export async function getWorkOSPortalURLInner(userId: number, orgId: number) {
  if (!workos) return null;
  const organization = await db.organization.findFirst({
    where: {
      id: orgId,
      membership: {
        some: {
          userId: userId,
        },
      },
    },
  });
  if (!organization?.workOsId) {
    return null;
  }
  const { link } = await workos.portal.generateLink({
    organization: organization.workOsId,
    intent: GeneratePortalLinkIntent.SSO,
    returnUrl: "https://app.placemark.io/",
  });
  return link;
}

/**
 * The Admin Portal is a standalone application
 * where your users can configure and manage WorkOS
 * resources such as Connections and Directories that
 * are scoped to their Organization.
 */
export default resolver.pipe(
  resolver.authorize(["OWNER", "SUPERADMIN"]),
  async (_arg, ctx) => {
    const { userId, orgId } = ctx.session;
    if (!orgId) return new NotFoundError();
    return getWorkOSPortalURLInner(userId, orgId);
  }
);
