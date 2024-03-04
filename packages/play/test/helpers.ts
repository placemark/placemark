import type {
  IWrappedFeature,
  MultiPolygon,
  IFeatureCollection,
  FeatureCollection,
  MultiPoint,
  MultiLineString,
  GeometryCollection,
  Polygon,
  Point,
  IFeature,
  FeatureMap,
  IFolder,
  Feature,
} from "types";
import Fs from "fs";
import Path from "path";
import { IDMap, UIDMap } from "app/lib/id_mapper";
import { PreviewProperty } from "state/jotai";
import deepFreeze from "deep-freeze";

export const NIL_PREVIEW: PreviewProperty = null;

export function tid(i: number) {
  return i.toString(16).padStart(21, "x");
}

export const ID_0 = tid(0);

function loadFixture(path: string): FeatureCollection {
  return JSON.parse(
    Fs.readFileSync(Path.join(__dirname, path), "utf8")
  ) as FeatureCollection;
}

export const exampleFolder: IFolder = deepFreeze({
  name: "Example",
  id: "00",
  expanded: true,
  visibility: true,
  locked: false,
  at: "a0",
  folderId: null,
});

export function wrap(fc: FeatureCollection): IWrappedFeature[] {
  return deepFreeze(
    fc.features.map((feature, i) => {
      return {
        wrappedFeatureCollectionId: "0".repeat(21),
        at: i.toString(16),
        id: i.toString(16).padStart(21, "0"),
        folderId: null,
        feature: feature,
      };
    })
  ) as unknown as IWrappedFeature[];
}

export function wrapMap(fc: FeatureCollection): FeatureMap {
  return new Map(
    fc.features.map((feature, i) => {
      return [
        i.toString(16).padStart(21, "0"),
        deepFreeze({
          wrappedFeatureCollectionId: "0".repeat(21),
          at: i.toString(16),
          id: i.toString(16).padStart(21, "0"),
          folderId: null,
          feature: feature,
        }),
      ];
    })
  ) as FeatureMap;
}

export function wrapMapAndId(fc: FeatureCollection) {
  const idMap: IDMap = UIDMap.empty();
  const wrappedFeatures: IWrappedFeature[] = [];
  const featureMap: FeatureMap = new Map(
    fc.features.map((feature, i) => {
      const id = i.toString(16).padStart(21, "0");
      UIDMap.pushUUID(idMap, id);
      const wrappedFeature = Object.freeze({
        wrappedFeatureCollectionId: "0".repeat(21),
        at: i.toString(16),
        id,
        folderId: null,
        feature: feature,
      });
      wrappedFeatures.push(wrappedFeature);
      return [id, wrappedFeature];
    })
  );
  return { wrappedFeatures, idMap, featureMap };
}

export function f(features: IFeature | IFeature[]): IFeatureCollection {
  return deepFreeze({
    type: "FeatureCollection",
    features: (Array.isArray(features) ? features : [features]).map(
      (feature) => {
        return {
          ...feature,
          properties: Object.freeze(feature.properties),
        };
      }
    ),
  }) as IFeatureCollection;
}

export const FIRST_COORDS = [
  "geojson",
  "features",
  0,
  "geometry",
  "coordinates",
];

export const point: Point = deepFreeze({
  type: "Point",
  coordinates: [0, 1],
}) as Point;

export const pointFeature: IFeature = deepFreeze({
  type: "Feature",
  geometry: point,
  properties: {
    a: 1,
  },
}) as unknown as IFeature;

export const twoPoints = f([
  pointFeature,
  {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [2, 3],
    },
    properties: {
      b: 1,
    },
  },
]);

export const fc = f([
  {
    type: "Feature",
    properties: {
      x: 1,
    },
    geometry: {
      type: "Point",
      coordinates: [0, 0],
    },
  },
]);

export const multiPoint: MultiPoint = deepFreeze({
  type: "MultiPoint",
  coordinates: [
    [0, 0],
    [1, 1],
  ],
}) as MultiPoint;

export const fcMultiPoint = f([
  {
    type: "Feature",
    properties: {
      x: 1,
    },
    geometry: multiPoint,
  },
]);

export const multiLineString: MultiLineString = deepFreeze({
  type: "MultiLineString",
  coordinates: [
    [
      [0, 0],
      [1, 1],
      [2, 2],
    ],
  ],
}) as MultiLineString;

export const realMultiLineString: IFeature<MultiLineString> = deepFreeze({
  type: "Feature",
  properties: {},
  geometry: {
    type: "MultiLineString",
    coordinates: [
      [
        [0, 0],
        [1, 1],
        [2, 2],
      ],
      [
        [10, 10],
        [11, 11],
        [12, 12],
      ],
    ],
  },
}) as IFeature<MultiLineString>;

export const fcMultiLineString = f([
  {
    type: "Feature",
    properties: {
      x: 1,
    },
    geometry: multiLineString,
  },
]);

export const fcLineString = f([
  {
    type: "Feature",
    properties: {
      x: 1,
    },
    geometry: {
      type: "LineString",
      coordinates: [
        [0, 0],
        [1, 1],
        [2, 2],
      ],
    },
  },
]);

export const fcRectangle = f({
  type: "Feature",
  properties: {
    x: 1,
  },
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [0, 0],
        [0, 1],
        [1, 1],
        [1, 0],
        [0, 0],
      ],
    ],
  },
});

const poly: Polygon = deepFreeze({
  type: "Polygon",
  coordinates: [
    [
      [0, 0],
      [1, 2],
      [2, 3],
      [0, 0],
    ],
  ],
}) as Polygon;

export const fcPoly = f([
  {
    type: "Feature",
    properties: {
      x: 1,
    },
    geometry: poly,
  },
]);

export const fcTwoPoly: IFeatureCollection<Polygon> = deepFreeze({
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        x: 1,
      },
      geometry: poly,
    },
    {
      type: "Feature",
      properties: {
        x: 1,
        hello: "World",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0.1, 0.1],
            [0.9, 1.9],
            [1.9, 2.9],
            [0.1, 0.1],
          ],
        ],
      },
    },
  ],
}) as unknown as IFeatureCollection<Polygon>;

export const fcTwoPolyContainable: IFeatureCollection<Polygon> = deepFreeze({
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        x: 1,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [2, 2],
            [2, 8],
            [8, 8],
            [8, 2],
            [2, 2],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        x: 1,
        hello: "World",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [0, 10],
            [10, 10],
            [10, 0],
            [0, 0],
          ],
        ],
      },
    },
  ],
}) as unknown as IFeatureCollection<Polygon>;

export const fcGeometryCollection = f([
  {
    type: "Feature",
    properties: {
      x: 1,
    },
    geometry: {
      type: "GeometryCollection",
      geometries: twoPoints.features.map(
        (feature) => feature.geometry as Point
      ),
    },
  },
]);

export const fcMultiPoly = f([
  {
    type: "Feature",
    properties: {
      x: 1,
    },
    geometry: {
      type: "MultiPolygon",
      coordinates: [
        [
          [
            [0, 0],
            [1, 2],
            [2, 3],
            [0, 0],
          ],
        ],
      ],
    },
  },
]);

export const multiPoly2: IFeature<MultiPolygon> = deepFreeze({
  type: "Feature",
  properties: {},
  geometry: {
    type: "MultiPolygon",
    coordinates: [
      [
        [
          [0, 0],
          [1, 2],
          [2, 3],
          [0, 0],
        ],
        [
          [0.5, 0],
          [1.5, 2],
          [2.5, 3],
          [0.5, 0],
        ],
        [
          [0.5, 0.5],
          [1.5, 2.5],
          [2.5, 3.5],
          [0.5, 0.5],
        ],
      ],
      [
        [
          [0, 0],
          [1, 2],
          [2, 3],
          [0, 0],
        ],
        [
          [0, 0.55],
          [1, 2.55],
          [2, 3.55],
          [0, 0.55],
        ],
      ],
    ],
  },
}) as IFeature<MultiPolygon>;

export const fcPolyHoles = deepFreeze(loadFixture("./fixture_poly_holes.json"));

export const fcLineAndPoly = f([
  fcMultiLineString.features[0],
  fcTwoPoly.features[0],
]);

export const geometryCollection2: IFeature<GeometryCollection> = deepFreeze({
  type: "Feature",
  properties: {},
  geometry: {
    type: "GeometryCollection",
    geometries: [
      multiPoly2.geometry,
      pointFeature.geometry,
      multiLineString,
      multiPoint,
    ],
  },
}) as IFeature<GeometryCollection>;

export const features = [
  fcLineString.features[0],
  fcMultiLineString.features[0],
  fcPoly.features[0],
  fcPolyHoles.features[0],
  multiPoly2,
  pointFeature,
  geometryCollection2,
  fcMultiPoly.features[0],
  fcGeometryCollection.features[0],
] as Feature[];

export const putPresenceContent = (
  id: number,
  userId: number,
  wrappedFeatureCollectionId: string
) => ({
  id,
  name: "putPresence",
  args: {
    pitch: 0,
    bearing: 0,
    minx: -123.18990452935536,
    miny: 49.25629237633768,
    maxx: -123.06318631791868,
    maxy: 49.27505273474617,
    updatedAt: "Wed, 08 Dec 2021 17:19:38 GMT",
    userName: "tom@macwright.com",
    userId: userId,
    cursorLongitude: -123.12995097556933,
    cursorLatitude: 49.25846336122666,
    wrappedFeatureCollectionId,
  },
});

export const putFeaturesContent = (
  id: number,
  wrappedFeatureCollectionId: string,
  featureId = "cf55b1a0-7561-11ec-91c4-2f6e209ecfb8"
) => ({
  id,
  name: "putFeatures",
  args: {
    features: [
      {
        id: featureId,
        at: "a0",
        feature: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Point",
            coordinates: [-123.16384809712915, 49.273347542362075],
          },
        },
      },
    ],
    wrappedFeatureCollectionId,
  },
});
