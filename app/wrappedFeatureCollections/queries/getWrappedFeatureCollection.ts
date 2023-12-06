import { resolver } from "@blitzjs/rpc";
import { Ctx } from "blitz";
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
 * Security: requires you to be on the team that published
 * this map.
 */
const getWrappedFeatureCollection = resolver.pipe(
  resolver.zod(GetWrappedFeatureCollection),
  resolver.authorize(),
  async (input, ctx: Ctx) => {
    const fc = await db.wrappedFeatureCollection.findFirstOrThrow({
      where: {
        id: input.id,
        organizationId: ctx.session.orgId,
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

    let layer = fc.layer as LayerConfigTemplate;
    if (fc.defaultLayer) {
      layer = LAYERS[fc.defaultLayer];
    }

    const symbolization: ISymbolization = parseSymbolization(
      fc.symbolization as JsonObject
    );

    return {
      type: "persisted",
      ...fc,
      layer,
      symbolization,
    } as const;
  }
);

export default getWrappedFeatureCollection;
