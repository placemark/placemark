import { resolver } from "@blitzjs/rpc";
import db from "db";
import { EditWrappedFeatureCollection } from "app/wrappedFeatureCollections/validations";

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
  }
);
