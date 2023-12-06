import { resolver } from "@blitzjs/rpc";
import db from "db";
import { EditWrappedFeatureCollection } from "app/wrappedFeatureCollections/validations";
import { capture } from "integrations/posthog";

export default resolver.pipe(
  resolver.zod(EditWrappedFeatureCollection),
  resolver.authorize(),
  async (args, ctx) => {
    const { id, ...data } = args;

    // Ensure that if you’re switching to a
    // layer, your organization owns it.
    if (typeof data.layerId === "number") {
      await db.mapboxLayer.findFirstOrThrow({
        where: {
          id: data.layerId,
          organizationId: ctx.session.orgId,
        },
      });
    }

    await db.wrappedFeatureCollection.updateMany({
      data,
      where: {
        id,
        organizationId: ctx.session.orgId!,
      },
    });

    capture(ctx, {
      event: "map-edit",
    });

    if (data.label) {
      capture(ctx, {
        event: "map-edit-label",
      });
    }

    if (data.defaultLayer) {
      capture(ctx, {
        event: "map-edit-default-layer",
      });
    }

    if (data.access !== undefined) {
      capture(ctx, {
        event: "map-edit-access-level",
        properties: {
          access: data.access,
        },
      });
    }

    if (data.layerId) {
      capture(ctx, {
        event: "map-edit-custom-layer",
      });
    }
  }
);
