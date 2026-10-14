import type { IWrappedFeature } from "types";
import { describe, expect, it } from "vitest";
import {
  decodeFlatGeobufToFeatures,
  encodeFeaturesToFlatGeobuf,
} from "./fgb_codec";

describe("fgb_codec", () => {
  it("round-trips wrapped features through FlatGeobuf", async () => {
    const features: IWrappedFeature[] = [
      {
        id: "f1",
        at: "a0",
        folderId: null,
        feature: {
          type: "Feature",
          geometry: { type: "Point", coordinates: [10, 20] },
          properties: { name: "Cafe" },
        },
      },
      {
        id: "f2",
        at: "a1",
        folderId: "folder-1",
        feature: {
          type: "Feature",
          geometry: { type: "Point", coordinates: [30, 40] },
          properties: null,
        },
      },
    ];

    const bytes = await encodeFeaturesToFlatGeobuf(features);
    const decoded = await decodeFlatGeobufToFeatures(bytes);

    expect(decoded).toHaveLength(2);
    expect(decoded.find((f) => f.id === "f1")).toMatchObject({
      id: "f1",
      at: "a0",
      folderId: null,
      feature: {
        geometry: { type: "Point", coordinates: [10, 20] },
        properties: { name: "Cafe" },
      },
    });
    expect(decoded.find((f) => f.id === "f2")).toMatchObject({
      id: "f2",
      at: "a1",
      folderId: "folder-1",
    });
  });

  it("drops ephemeral features when encoding", async () => {
    const features: IWrappedFeature[] = [
      {
        id: "f1",
        at: "a0",
        folderId: null,
        ephemeral: true,
        feature: {
          type: "Feature",
          geometry: { type: "Point", coordinates: [0, 0] },
          properties: null,
        },
      },
    ];

    const bytes = await encodeFeaturesToFlatGeobuf(features);
    const decoded = await decodeFlatGeobufToFeatures(bytes);
    expect(decoded).toHaveLength(0);
  });

  it("handles null geometries (adjustForFgb filters them)", async () => {
    const features: IWrappedFeature[] = [
      {
        id: "f1",
        at: "a0",
        folderId: null,
        feature: {
          type: "Feature",
          geometry: null,
          properties: { name: "Feature with no geometry" },
        },
      },
    ];

    const bytes = await encodeFeaturesToFlatGeobuf(features);
    const decoded = await decodeFlatGeobufToFeatures(bytes);
    expect(decoded).toHaveLength(0);
  });

  it("encodes and decodes empty input", async () => {
    const bytes = await encodeFeaturesToFlatGeobuf([]);
    const decoded = await decodeFlatGeobufToFeatures(bytes);
    expect(decoded).toHaveLength(0);
  });

  it("preserves later features' properties when the first feature has none", async () => {
    // Regression: `flatgeobuf.serialize` infers its column schema from
    // `features[0].properties` only, so a first feature with no
    // properties used to wipe every other feature's properties.
    const features: IWrappedFeature[] = [
      {
        id: "f1",
        at: "a0",
        folderId: null,
        feature: {
          type: "Feature",
          geometry: { type: "Point", coordinates: [0, 0] },
          properties: null,
        },
      },
      {
        id: "f2",
        at: "a1",
        folderId: null,
        feature: {
          type: "Feature",
          geometry: { type: "Point", coordinates: [1, 1] },
          properties: { name: "Cafe" },
        },
      },
    ];

    const bytes = await encodeFeaturesToFlatGeobuf(features);
    const decoded = await decodeFlatGeobufToFeatures(bytes);

    expect(decoded).toHaveLength(2);
    expect(decoded.find((f) => f.id === "f1")?.feature.properties).toBeNull();
    expect(
      decoded.find((f) => f.id === "f2")?.feature.properties,
    ).toStrictEqual({ name: "Cafe" });
  });

  it("keeps distinct property key sets across features", async () => {
    const features: IWrappedFeature[] = [
      {
        id: "f1",
        at: "a0",
        folderId: null,
        feature: {
          type: "Feature",
          geometry: { type: "Point", coordinates: [0, 0] },
          properties: { a: 1 },
        },
      },
      {
        id: "f2",
        at: "a1",
        folderId: null,
        feature: {
          type: "Feature",
          geometry: { type: "Point", coordinates: [1, 1] },
          properties: { b: 2, c: 3 },
        },
      },
    ];

    const bytes = await encodeFeaturesToFlatGeobuf(features);
    const decoded = await decodeFlatGeobufToFeatures(bytes);

    expect(
      decoded.find((f) => f.id === "f1")?.feature.properties,
    ).toStrictEqual({ a: 1 });
    expect(
      decoded.find((f) => f.id === "f2")?.feature.properties,
    ).toStrictEqual({ b: 2, c: 3 });
  });

  it("round-trips nested object and array property values", async () => {
    const features: IWrappedFeature[] = [
      {
        id: "f1",
        at: "a0",
        folderId: null,
        feature: {
          type: "Feature",
          geometry: { type: "Point", coordinates: [0, 0] },
          properties: { tags: ["x", "y"], meta: { k: 1 } },
        },
      },
    ];

    const bytes = await encodeFeaturesToFlatGeobuf(features);
    const decoded = await decodeFlatGeobufToFeatures(bytes);

    const properties = decoded[0].feature.properties;
    expect(properties).toStrictEqual({ tags: ["x", "y"], meta: { k: 1 } });
    expect(typeof properties?.tags).not.toBe("string");
    expect(Array.isArray(properties?.tags)).toBe(true);
    expect(typeof properties?.meta).toBe("object");
  });

  it("round-trips null properties correctly", async () => {
    const features: IWrappedFeature[] = [
      {
        id: "f1",
        at: "a0",
        folderId: "folder-1",
        feature: {
          type: "Feature",
          geometry: { type: "Point", coordinates: [0, 0] },
          properties: null,
        },
      },
    ];

    const bytes = await encodeFeaturesToFlatGeobuf(features);
    const decoded = await decodeFlatGeobufToFeatures(bytes);

    expect(decoded).toHaveLength(1);
    expect(decoded[0]).toMatchObject({
      id: "f1",
      at: "a0",
      folderId: "folder-1",
      feature: {
        geometry: { type: "Point", coordinates: [0, 0] },
        properties: null,
      },
    });
  });
});
