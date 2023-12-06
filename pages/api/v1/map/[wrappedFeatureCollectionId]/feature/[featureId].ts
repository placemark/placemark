import { api } from "app/blitz-server";
import { NextApiHandler } from "next";
import db from "db";
import { z } from "zod";
import type { Feature, IWrappedFeature } from "types";
import { wrappedFeatureToExportable } from "app/lib/convert/local/geojson";

const Q = z.object({
  wrappedFeatureCollectionId: z.string().length(21),
  featureId: z.string().uuid(),
});

/**
 * Reference {@link getAPIURLFeature} in lib/api, which
 * refers to the URL of this API.
 */
const handler: NextApiHandler = async (req, res) => {
  const { wrappedFeatureCollectionId, featureId } = Q.parse(req.query);

  const [wfc, wrappedFeature] = await Promise.all([
    db.wrappedFeatureCollection.findFirst({
      where: {
        id: wrappedFeatureCollectionId,
        access: "PUBLIC",
      },
    }),
    db.wrappedFeature.findFirst({
      select: {
        feature: true,
        id: true,
      },
      where: {
        wrappedFeatureCollectionId,
        id: featureId,
        deleted: false,
      },
    }),
  ]);

  if (!wfc) {
    return res.status(404).send({ error: "Map not found" });
  }

  if (!wrappedFeature) {
    return res.status(404).send("Feature not found");
  }

  const f: Feature = wrappedFeatureToExportable(
    wrappedFeature as unknown as IWrappedFeature,
    {
      winding: "RFC7946",
      truncate: true,
      addBboxes: false,
      indent: false,
      includeId: true,
    }
  );

  return res.send(f);
};

export default api(handler);
