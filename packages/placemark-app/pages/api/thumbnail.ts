import { NextApiRequest, NextApiResponse } from "next";
import { env } from "app/lib/env_client";
import db from "db";
import { z } from "zod";
import clamp from "lodash/clamp";
import {
  e6bbox,
  e6geojson,
  getExtent,
  isBBoxEmpty,
  padBBox,
} from "app/lib/geometry";
import { BBox, Feature, FeatureCollection, IWrappedFeature } from "types";
import { collapseGeoJSON } from "app/lib/collapse_geojson";
import { api } from "app/blitz-server";

// https://docs.mapbox.com/api/maps/static-images/#troubleshooting-shorten-static-images-api-requests
const MAX_URL_LENGTH = 8192;

const Q = z.object({
  id: z.string(),
  darkMode: z.enum(["true", "false"]),
});

export async function thumbnailInner(
  query: NextApiRequest["query"]
): Promise<string> {
  const { id, darkMode } = Q.parse(query);

  const wrappedFeatures = (await db.wrappedFeature.findMany({
    where: {
      wrappedFeatureCollectionId: id,
      deleted: false,
    },
    take: 200,
  })) as unknown as IWrappedFeature<Feature>[];

  const fc = collapseGeoJSON(
    e6geojson(
      {
        type: "FeatureCollection",
        features: wrappedFeatures.map((f): Feature => {
          return {
            type: "Feature",
            geometry: f.feature.geometry,
            properties: null,
          };
        }),
      },
      4
    ) as FeatureCollection
  );

  const extent = getExtent(wrappedFeatures)
    .map((box) => {
      if (isBBoxEmpty(box)) {
        return padBBox(box, 2);
      }
      return box;
    })
    .map((bbox) => {
      const clamped: BBox = [
        bbox[0],
        clamp(bbox[1], -85, 85),
        bbox[2],
        clamp(bbox[3], -85, 85),
      ];
      return clamped;
    })
    .caseOf({
      Just(bbox) {
        return `[${e6bbox(bbox)}]`;
      },
      Nothing() {
        return `[-180,-85,180,85]`;
      },
    });

  const size = `600x400`;
  const style = darkMode === "true" ? "dark-v10" : "light-v10";

  /**
   * https://docs.mapbox.com/api/maps/static-images/#retrieve-a-static-map-from-a-style
   */
  const qs = new URLSearchParams({
    access_token: env.NEXT_PUBLIC_MAPBOX_TOKEN,
    attribution: "false",
    logo: "false",
    padding: "5",
  }).toString();

  while (fc.features.length) {
    const geojson = `geojson(${encodeURIComponent(JSON.stringify(fc))})`;
    const url = `https://api.mapbox.com/styles/v1/mapbox/${style}/static/${geojson}/${extent}/${size}?${qs}`;

    if (url.length < MAX_URL_LENGTH) {
      return url;
    }
    fc.features.pop();
  }

  return `https://api.mapbox.com/styles/v1/mapbox/${style}/static/${extent}/${size}?${qs}`;
}

/**
 * FIXME: enforce authentication
 */
export default api(async function thumbnail(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.status(400).end("GET method only");
    return;
  }

  res.setHeader("Cache-Control", "public, max-age=120");

  const url = await thumbnailInner(req.query);
  res.redirect(url);
});
