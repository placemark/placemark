import { resolver } from "@blitzjs/rpc";
import db from "db";

const getOrganizations = resolver.pipe(
  resolver.authorize(["SUPERADMIN"]),
  async (_input, _ctx) => {
    const organizations = await db.organization.findMany({
      include: {
        _count: {
          select: {
            membership: true,
            wrappedFeatureCollections: true,
          },
        },
      },
    });
    return organizations;
  }
);

export default getOrganizations;
