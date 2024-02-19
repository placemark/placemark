import { resolver } from "@blitzjs/rpc";
import { Ctx, NotFoundError } from "blitz";
import db from "db";
import { ISymbolization } from "types";
import { z } from "zod";
import { parseSymbolization } from "app/lib/utils_server";
import { JsonObject } from "type-fest";
import LAYERS, { LayerConfigTemplate } from "app/lib/default_layers";

const GetWrappedFeatureCollection = z.object({
  id: z.string(),
});

/**
 * Security: available to the public. Exposes published maps.
 */
const getWrappedFeatureCollectionData = resolver.pipe(
  resolver.zod(GetWrappedFeatureCollection),
  async (input, _ctx: Ctx) => {
    const meta = await db.wrappedFeatureCollection.findFirst({
      where: {
        id: input.id,
        access: "PUBLIC",
      },
      include: {
        layer: true,
        organization: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!meta) {
      throw new NotFoundError();
    }

    let layer = meta.layer as LayerConfigTemplate;

    if (meta.defaultLayer) {
      layer = LAYERS[meta.defaultLayer];
    }

    const layerConfigs = await db.layerConfig.findMany({
      where: {
        wrappedFeatureCollectionId: input.id,
        deleted: false,
      },
    });

    const symbolization: ISymbolization = parseSymbolization(
      meta.symbolization as JsonObject
    );

    const folders = await db.folder.findMany({
      where: {
        wrappedFeatureCollectionId: input.id,
        deleted: false,
      },
    });

    return {
      meta: {
        ...meta,
        symbolization,
        layer,
      },
      layerConfigs,
      folders,
    };
  }
);

export default getWrappedFeatureCollectionData;
