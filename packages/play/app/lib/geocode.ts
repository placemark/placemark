import type { LngLat } from "mapbox-gl";
import { env } from "app/lib/env_client";
import {
  bboxToPolygon,
  formatCoordinates,
  parseBBOX,
  parseCoordinates,
} from "./geometry";
import pick from "lodash/pick";
import { Either, Left, Right } from "purify-ts/Either";
import { ConvertError } from "./errors";
import { IFeature, IFeatureCollection, IWrappedFeature, Point } from "types";
import { z } from "zod";
import { truncate } from "./utils";
import { JsonObject } from "type-fest";
import Fuse from "fuse.js";
import { Action } from "app/components/context_actions/action_item";
import { ContainerNode, LeafNode } from "app/lib/tree";

interface TreeFolder {
  folderId: any;
  name: string;
  id: any;
}

interface TreeWfc {
  name: string;
  wrappedFeatureCollectionFolderId: any;
}

type SearchIndex = Fuse<IWrappedFeature>;

type QItemWrappedFeature = {
  type: "wrappedFeature";
  result: Fuse.FuseResult<IWrappedFeature>;
};

type QItemAction = {
  type: "action";
  action: Action;
};

type QItemCoordinate = {
  type: "coordinate";
  name: string;
  coordinates: [number, number];
};

type QItemExtent = {
  type: "extent";
  name: string;
  coordinates: [number, number, number, number];
};

type QItemContainerNode = ContainerNode<TreeFolder, TreeWfc>;
type QItemLeafNode = LeafNode<TreeWfc>;

export type QItemAddable = IGeocoderFeature | QItemCoordinate | QItemExtent;

export type QItem =
  | QItemAddable
  | QItemWrappedFeature
  | QItemAction
  | QItemContainerNode
  | QItemLeafNode;

/**
 * Parse geocode.earth response -----------------------------------------------
 */
const zBBox4 = z.tuple([z.number(), z.number(), z.number(), z.number()]);

const GeocoderProperties = z
  .object({
    id: z.string(),
    label: z.string(),
  })
  .passthrough();

type IGeocoderProperties = z.infer<typeof GeocoderProperties>;

const zPoint: z.ZodType<Point> = z.lazy(() =>
  z.object({
    type: z.literal("Point"),
    coordinates: z.array(z.number()).min(2),
  })
);

const GeocoderFeature = z.object({
  type: z.literal("Feature"),
  geometry: zPoint,
  bbox: z.optional(zBBox4),
  properties: GeocoderProperties,
});

type IGeocoderFeature = IFeature<Point, IGeocoderProperties>;

export const GeocodeEarthResult: z.ZodType<
  IFeatureCollection<Point, IGeocoderProperties>
> = z.lazy(() => {
  return z.object({
    bbox: z.optional(zBBox4),
    geocoding: z.any(),
    type: z.literal("FeatureCollection"),
    features: z.array(GeocoderFeature),
  });
});

/**
 * Transform a Pos2 coordinate into a QItem, if it seems
 * valid, otherwise return nothing.
 */
export function coordFeature(
  pos: Pos2,
  flip = false
): Either<ConvertError, QItemCoordinate> {
  if (flip) {
    pos = pos.slice().reverse() as Pos2;
  }
  if (pos[1] > 90 || pos[1] < -90) {
    return Left(new ConvertError("Coordinate out of bounds"));
  }
  return Right({
    type: "coordinate",
    name: `${formatCoordinates(pos)}`,
    coordinates: pos,
  });
}

/**
 * Convert bbox into a QItem. Can't fail, but maybe should.
 */
export function bboxToQItem(bbox: BBox4): QItemExtent {
  return {
    type: "extent",
    name: `${bbox.join(",")}`,
    coordinates: bbox,
  };
}

export function getQItemNamePreview(item: QItemAddable): string {
  switch (item.type) {
    case "Feature": {
      return truncate(item.properties.label, 24);
    }
    case "extent": {
      return item.name;
    }
    case "coordinate": {
      return item.name;
    }
  }
}

function includeProperties(properties: JsonObject, includeData = false) {
  if (includeData || !properties) return properties;
  return pick(properties, ["name", "label"]);
}

export function qItemToPolygon(
  item: QItemAddable,
  includeData = false
): IFeature | null {
  switch (item.type) {
    case "coordinate":
      return null;
    case "Feature": {
      if (item.bbox) {
        return {
          type: "Feature",
          geometry: bboxToPolygon(item.bbox),
          // @ts-expect-error todo
          properties: includeProperties(item.properties, includeData),
        };
      }
      return null;
    }
    case "extent": {
      return {
        type: "Feature",
        geometry: bboxToPolygon(item.coordinates),
        properties: {},
      };
    }
  }
}

export function qItemToFeature(
  item: QItemAddable,
  includeData = false
): IFeature {
  switch (item.type) {
    case "Feature": {
      return {
        ...item,
        // @ts-expect-error todo
        properties: includeProperties(item.properties, includeData),
      };
    }
    case "extent": {
      return {
        type: "Feature",
        geometry: bboxToPolygon(item.coordinates),
        properties: {},
      };
    }
    case "coordinate": {
      return {
        type: "Feature",
        geometry: {
          coordinates: item.coordinates,
          type: "Point",
        },
        properties: {},
      };
    }
  }
}

/**
 * Get the possible coordinate and bbox interpretations
 * of the user input.
 */
export function getLiteralItems(query: string) {
  const coordEither = parseCoordinates(query);
  const coord = coordEither.chain((pos) => coordFeature(pos));
  const coord2 = coordEither.chain((pos) => coordFeature(pos, true));
  const bbox = parseBBOX(query).map(bboxToQItem);
  return Either.rights<ConvertError, QItem>([bbox, coord, coord2]);
}

export function getActions(query: string, actions: Action[]): QItemAction[] {
  const searchIndex = new Fuse(actions, {
    keys: ["label"],
    isCaseSensitive: false,
    threshold: 0.2,
    ignoreLocation: true,
  });
  const results = searchIndex.search(query, {
    limit: 5,
  });
  return results.map((result) => {
    return {
      type: "action",
      action: result.item,
    };
  });
}

export function getFeatureItems(
  query: string,
  searchIndex: SearchIndex
): QItemWrappedFeature[] {
  const results = searchIndex.search(query, {
    limit: 5,
  });
  return results.map((result) => {
    return {
      type: "wrappedFeature",
      result,
    };
  });
}

export interface GeocoderResults {
  literal: QItem[];
  features: QItem[];
  geocoder: QItem[];
  actions: QItem[];
}

/**
 * This does more than just search geocode earth - it
 * also returns literal items.
 */
export async function geocodeEarth({
  query,
  center,
  zoom,
  signal,
  searchIndex,
  actions,
}: {
  query: string;
  center: LngLat | undefined;
  zoom: number | undefined;
  signal: AbortSignal | undefined;
  searchIndex: SearchIndex;
  actions: Action[];
}): Promise<GeocoderResults> {
  if (!query) {
    return {
      literal: [],
      features: [],
      geocoder: [],
      actions: [],
    };
  }

  const params = {
    api_key: env.NEXT_PUBLIC_GEOCODE_EARTH_TOKEN,
    text: query,
    limit: "5",
    ...(zoom !== undefined && zoom > 4 && center
      ? {
          "focus.point.lon": center.lng.toString(),
          "focus.point.lat": center.lat.toString(),
        }
      : {}),
  };

  const queryString = new URLSearchParams(params).toString();

  const resp = GeocodeEarthResult.parse(
    await (
      await fetch(`https://api.geocode.earth/v1/autocomplete?${queryString}`, {
        signal: signal || null,
      })
    ).json()
  );

  return {
    literal: getLiteralItems(query),
    actions: getActions(query, actions),
    features: getFeatureItems(query, searchIndex),
    geocoder: resp.features,
  };
}
