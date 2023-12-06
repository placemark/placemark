import { api } from "app/blitz-server";
import { NextApiHandler } from "next";
import db from "db";
import { z } from "zod";
import pointInPolygon from "@turf/boolean-point-in-polygon";
import type { IFeature, IWrappedFeature } from "types";
import { wrappedFeaturesToFeatureCollection } from "app/lib/convert/local/geojson";

const toNumber = (str: string) => {
  const num = parseFloat(str);
  return isNaN(num) ? undefined : num;
};

const Q = z.object({
  wrappedFeatureCollectionId: z.string().length(21),
  folder: z.optional(z.union([z.string().uuid(), z.array(z.string().uuid())])),
  intersect_latitude: z.optional(z.string().transform(toNumber)),
  intersect_longitude: z.optional(z.string().transform(toNumber)),
});

type IQ = z.infer<typeof Q>;

/**
 * Get an etag that represents the latest version
 * of this wrappedFeatureCollection.
 */
export async function getEtag(query: IQ): Promise<string | null> {
  const [wrappedFeatureCollection, latestVersion] = await Promise.all([
    db.wrappedFeatureCollection.findFirst({
      where: {
        id: query.wrappedFeatureCollectionId,
        access: "PUBLIC",
      },
    }),
    db.wrappedFeature.aggregate({
      _max: {
        version: true,
      },
      where: {
        wrappedFeatureCollectionId: query.wrappedFeatureCollectionId,
      },
    }),
  ]);

  const maxVersion = latestVersion._max.version;

  if (maxVersion === null || !wrappedFeatureCollection) {
    return null;
  }

  return `W/"v1/${maxVersion}-${Buffer.from(JSON.stringify(query)).toString(
    "base64url"
  )}"`;
}

export async function featureCollectionInner(query: z.infer<typeof Q>) {
  const { folder, intersect_latitude, intersect_longitude } = query;

  let wrappedFeatures = await db.wrappedFeature.findMany({
    select: {
      feature: true,
      id: true,
      folderId: true,
    },
    orderBy: {
      at: "desc",
    },
    where: {
      wrappedFeatureCollectionId: query.wrappedFeatureCollectionId,
      deleted: false,
      ...(query.folder
        ? {
            folderId: {
              in: typeof folder === "string" ? [folder] : folder,
            },
          }
        : {}),
    },
  });

  const pt: [number | undefined, number | undefined] = [
    intersect_longitude,
    intersect_latitude,
  ];

  const hasIntersectQuery = pt.every((val) => typeof val === "number");

  if (hasIntersectQuery) {
    wrappedFeatures = wrappedFeatures.filter((feature) => {
      const geometry = (feature.feature as unknown as IFeature).geometry;
      if (!geometry) return false;
      switch (geometry?.type) {
        case "Polygon":
        case "MultiPolygon": {
          return pointInPolygon(pt as [number, number], geometry);
        }
        default: {
          return false;
        }
      }
    });
  }

  return wrappedFeaturesToFeatureCollection(
    wrappedFeatures as unknown as IWrappedFeature[],
    {
      winding: "RFC7946",
      truncate: true,
      addBboxes: false,
      indent: false,
      includeId: true,
    }
  );
}

/**
 * Reference {@link getAPIURL} in lib/api, which
 * refers to the URL of this API.
 */
const handler: NextApiHandler = async (req, res) => {
  const query = Q.parse(req.query);

  const etag = await getEtag(query);

  /**
   * If we couldn’t get an etag, that means the featurecollection
   * does not exist or is private, so return a 404.
   */
  if (etag === null) {
    res.status(404);
    res.end();
    return;
  }

  /**
   * Otherwise, we have an etag. If we also have an incoming
   * if-none-match header, check to see if we've already
   * cached that version. This lets revalidations use a fast
   * aggregate query and less bandwidth.
   */
  if (req.headers["if-none-match"] === etag) {
    res.status(304);
    res.end();
    return;
  } else {
    // console.log(`Rebuild: ${etag} vs ${req.headers["if-none-match"] || ""}`);
  }

  /**
   * Otherwise, we are now returning a fresh response.
   */
  const content = await featureCollectionInner(query);
  res.setHeader("Cache-Control", "public, no-cache, must-revalidate");
  res.setHeader("ETag", etag);
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(content));
};

export default api(handler);
