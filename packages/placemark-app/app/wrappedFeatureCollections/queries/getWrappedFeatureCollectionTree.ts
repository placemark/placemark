import { resolver } from "@blitzjs/rpc";
import { buildTree, extractContainer, extractLeaf } from "app/lib/tree";
import { Ctx } from "blitz";
import db from "db";

const getWrappedFeatureCollectionTree = resolver.pipe(
  resolver.authorize(),
  async (_input, ctx: Ctx) => {
    const [wfcs, folders] = await Promise.all([
      db.wrappedFeatureCollection.findMany({
        where: {
          organizationId: ctx.session.orgId,
        },
        include: {
          createdBy: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      db.wrappedFeatureCollectionFolder.findMany({
        where: {
          organizationId: ctx.session.orgId,
        },
        include: {
          createdBy: true,
          _count: {
            select: {
              wrappedFeatureCollections: true,
              childFolders: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
    ]);

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

    const wfcsEnhanced = wfcs.map((wfc) => {
      return {
        ...wfc,
        _count: {
          wrappedFeatures: countMap.get(wfc.id) || 0,
        },
      };
    });

    const tree = buildTree({
      containers: folders,
      containerParentMember: "folderId",
      containerIdMember: "id",
      leafs: wfcsEnhanced,
      leafParentMember: "wrappedFeatureCollectionFolderId",
    });

    return tree;
  }
);

type Tree = Awaited<ReturnType<typeof getWrappedFeatureCollectionTree>>;

export type TreeWfc = extractLeaf<Tree>;
export type TreeFolder = extractContainer<Tree>;

export default getWrappedFeatureCollectionTree;
