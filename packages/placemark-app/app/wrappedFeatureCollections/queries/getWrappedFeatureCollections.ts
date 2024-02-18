import { resolver } from "@blitzjs/rpc";
import { Ctx } from "blitz";
import db from "db";

const getWrappedFeatureCollections = resolver.pipe(
  resolver.authorize(),
  async (_input, ctx: Ctx) => {
    const wfcs = await db.wrappedFeatureCollection.findMany({
      where: {
        organizationId: ctx.session.orgId,
      },
      include: {
        createdBy: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const counts = await db.wrappedFeature.groupBy({
      by: ["wrappedFeatureCollectionId"],
      _count: {
        _all: true,
      },
      where: {
        deleted: false,
        wrappedFeatureCollectionId: {
          in: wfcs.map((wfc) => wfc.id),
        },
      },
    });

    const countMap = new Map(
      counts.map((row) => {
        return [row.wrappedFeatureCollectionId, row._count._all];
      })
    );

    return wfcs.map((wfc) => {
      return {
        ...wfc,
        _count: {
          wrappedFeatures: countMap.get(wfc.id) || 0,
        },
      };
    });
  }
);

export default getWrappedFeatureCollections;

export type WithCount = Awaited<
  ReturnType<typeof getWrappedFeatureCollections>
>[0];
