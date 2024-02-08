import { resolver } from "@blitzjs/rpc";
import db from "db";
import { capture, identifyOrganization } from "integrations/posthog";
import { Name } from "../validations";

export default resolver.pipe(
  resolver.zod(Name),
  resolver.authorize(["OWNER"]),
  async ({ id, name }, ctx) => {
    const membership = await db.membership.findFirstOrThrow({
      where: { organizationId: id, userId: ctx.session.userId },
      include: {
        organization: true,
      },
    });

    const organization = await db.organization.update({
      where: { id },
      data: { name },
    });

    capture(ctx, {
      event: "organization-rename",
    });

    identifyOrganization(organization);

    return true;
  }
);
