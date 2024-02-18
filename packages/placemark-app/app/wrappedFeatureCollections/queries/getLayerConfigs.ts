import { resolver } from "@blitzjs/rpc";
import { Ctx } from "blitz";
import db from "db";
import LAYERS from "app/lib/default_layers";

const getLayerConfigs = resolver.pipe(
  resolver.authorize(),
  async (_input, ctx: Ctx) => {
    const wfcIds = await db.wrappedFeatureCollection.findMany({
      select: {
        id: true,
      },
      where: {
        organizationId: ctx.session.orgId,
      },
    });
    const layerConfigs = await db.layerConfig.findMany({
      where: {
        wrappedFeatureCollectionId: {
          in: wfcIds.map((row) => row.id),
        },
        url: {
          not: {
            in: Object.values(LAYERS).map((layer) => layer.url),
          },
        },
        deleted: false,
      },

      orderBy: {
        createdAt: "desc",
      },

      distinct: ["url", "type"],
    });

    return layerConfigs;
  }
);

export default getLayerConfigs;
