import { resolver } from "@blitzjs/rpc";
import { workos } from "integrations/workos";
import db from "db";
import { Provision } from "../validations";

/**
 * Provision an organization in WorkOS
 */
export default resolver.pipe(
  resolver.authorize(["SUPERADMIN"]),
  resolver.zod(Provision),
  async ({ id, domain }, _ctx) => {
    if (!workos) return;

    const organization = await db.organization.findFirstOrThrow({
      where: {
        id,
      },
    });

    const workOSOrganization = await workos.organizations.createOrganization({
      name: organization.name,
      domains: [domain],
    });

    await db.organization.update({
      where: { id },
      data: {
        workOsId: workOSOrganization.id,
      },
    });
  }
);
