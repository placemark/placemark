import { resolver } from "@blitzjs/rpc";
import db from "db";
import { ChangeRole } from "app/memberships/validations";
import { capture } from "integrations/posthog";

/**
 * Change the role of an organization member.
 *
 * Rules:
 *
 * - The acting user MUST be an owner or superadmin
 * - After this role has been changed, there needs
 *   to be an owner remaining in the same organization.
 */
export default resolver.pipe(
  resolver.zod(ChangeRole),
  resolver.authorize(["OWNER", "SUPERADMIN"]),
  async ({ id, role }, ctx) => {
    if (role !== "OWNER") {
      // Enforce that there is an owner remaining in
      // this organization after this person is demoted.
      await db.membership.findFirstOrThrow({
        where: {
          organizationId: ctx.session.orgId,
          role: "OWNER",
          id: {
            not: id,
          },
        },
      });
    }

    await db.membership.updateMany({
      data: { role },
      where: { id: id, organizationId: ctx.session.orgId },
    });

    capture(ctx, {
      event: "role-change",
    });

    return true;
  }
);
