import type { Feature, IWrappedFeature } from "types";
import { expect, it } from "vitest";
import {
  decodeFlatGeobufToFeatures,
  encodeFeaturesToFlatGeobuf,
} from "./fgb_codec";

let next = 0;

/** A minimal wrapped point feature; override fields via the two arguments.
 * Pass `geometry: null` explicitly for a geometry-less feature. */
function feature(
  opts: {
    geometry?: Feature["geometry"];
    properties?: Feature["properties"];
  } = {},
  wrapped: Partial<IWrappedFeature> = {},
): IWrappedFeature {
  // Destructuring defaults apply only to `undefined`, so an explicit
  // `geometry: null` survives as a geometry-less feature.
  const {
    geometry = { type: "Point", coordinates: [0, 0] },
    properties = null,
  } = opts;
  return {
    id: `f${++next}`,
    at: "a0",
    folderId: null,
    feature: {
      type: "Feature",
      geometry,
      properties,
    },
    ...wrapped,
  };
}

const roundTrip = async (features: IWrappedFeature[]) =>
  decodeFlatGeobufToFeatures(await encodeFeaturesToFlatGeobuf(features));

it("round-trips wrapped features through FlatGeobuf", async () => {
  const features = [
    feature({ properties: { name: "Cafe", tags: ["x", "y"], meta: { k: 1 } } }),
    feature({}, { at: "a1", folderId: "folder-1" }),
  ];

  expect(await roundTrip(features)).toStrictEqual(features);
});

it.for([
  [
    "a property-less first feature",
    // Regression: `flatgeobuf.serialize` infers its column schema from
    // `features[0].properties` alone, so a first feature with no
    // properties must not wipe the later features' properties.
    [feature(), feature({ properties: { name: "Cafe" } })],
    [null, { name: "Cafe" }],
  ],
  [
    "distinct property key sets",
    [
      feature({ properties: { a: 1 } }),
      feature({ properties: { b: 2, c: 3 } }),
    ],
    [{ a: 1 }, { b: 2, c: 3 }],
  ],
] as Array<
  [string, IWrappedFeature[], Array<Feature["properties"]>]
>)("preserves every feature's properties with %s", async ([
  ,
  features,
  expected,
]) => {
  const decoded = await roundTrip(features);
  expect(decoded.map((f) => f.feature.properties)).toStrictEqual(expected);
});

it.for([
  ["an empty collection", []],
  ["only null-geometry features", [feature({ geometry: null })]],
  ["only ephemeral features", [feature({}, { ephemeral: true })]],
] as Array<[string, IWrappedFeature[]]>)("encodes %s to zero features", async ([
  ,
  features,
]) => {
  expect(await roundTrip(features)).toStrictEqual([]);
});
