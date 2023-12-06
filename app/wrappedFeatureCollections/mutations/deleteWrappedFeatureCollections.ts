import { resolver } from "@blitzjs/rpc";
import db from "db";
import { capture } from "integrations/posthog";
import { z } from "zod";

const DeleteWrappedFeatureCollections = z.object({
  ids: z.array(z.string()),
});

/**
 * Security: ensures that the target feature collections
 * are in your organization.
 */
export default resolver.pipe(
  resolver.zod(DeleteWrappedFeatureCollections),
  resolver.authorize(),
  async ({ ids }, ctx) => {
    await db.wrappedFeatureCollection.deleteMany({
      where: {
        id: {
          in: ids,
        },
        organizationId: ctx.session.orgId,
      },
    });

    capture(ctx, {
      event: "map-delete",
      properties: {
        count: ids.length,
      },
    });
  }
);
