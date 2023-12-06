import { resolver } from "@blitzjs/rpc";
import db from "db";
import { capture } from "integrations/posthog";
import { z } from "zod";
import { validate } from "uuid";

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
    const folderIds: string[] = [];
    const wfcIds: string[] = [];

    for (const id of ids) {
      if (validate(id)) {
        folderIds.push(id);
      } else {
        wfcIds.push(id);
      }
    }

    await Promise.all([
      db.wrappedFeatureCollectionFolder.deleteMany({
        where: {
          id: {
            in: folderIds,
          },
          organizationId: ctx.session.orgId,
        },
      }),
      db.wrappedFeatureCollection.deleteMany({
        where: {
          id: {
            in: wfcIds,
          },
          organizationId: ctx.session.orgId,
        },
      }),
    ]);

    capture(ctx, {
      event: "map-delete",
      properties: {
        count: ids.length,
      },
    });

    return true;
  }
);
