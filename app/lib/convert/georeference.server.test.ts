import { generateAnnotation, parseAnnotation } from "@allmaps/annotation";
import { getImportExtent } from "app/components/dialogs/import_utils";
import { georeferenceAnnotation } from "test/georeference_annotation";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_IMPORT_OPTIONS,
  detectJson,
  detectType,
  type ImportOptions,
} from ".";
import { Georeference } from "./georeference";

function options(choices: ImportOptions["georeferenceOptions"]): ImportOptions {
  return {
    ...DEFAULT_IMPORT_OPTIONS,
    type: "georeference",
    georeferenceOptions: choices,
  };
}

describe("Georeference Annotation import", () => {
  it.each([
    { points: true, layer: false, mask: false },
    { points: false, layer: true, mask: false },
    { points: false, layer: false, mask: true },
    { points: true, layer: true, mask: false },
    { points: true, layer: false, mask: true },
    { points: false, layer: true, mask: true },
    { points: true, layer: true, mask: true },
  ])("imports the selected outputs: %j", async (choices) => {
    const result = (
      await Georeference.forwardString(
        JSON.stringify(georeferenceAnnotation()),
        options(choices),
      )
    ).unsafeCoerce();
    const map = result.maps[0];
    expect(map.geojson.features).toHaveLength(
      (choices.points ? 3 : 0) + (choices.mask ? 1 : 0),
    );
    expect(!!map.annotation).toBe(choices.layer);
    expect(getImportExtent(result).isJust()).toBe(true);
    expect(result.notes).toEqual([]);
    if (choices.points) {
      expect(map.geojson.features[0]).toMatchObject({
        geometry: { type: "Point", coordinates: [4, 53] },
        properties: {
          resourceCoords: [0, 0],
          mapId: "https://example.com/annotations/map-1",
          imageId: "https://example.com/image",
        },
      });
    }
    if (choices.layer) expect(parseAnnotation(map.annotation)).toHaveLength(1);
    if (choices.mask) {
      const geometry = map.geojson.features.at(-1)!.geometry;
      expect(geometry?.type).toBe("Polygon");
      if (geometry?.type !== "Polygon") throw new Error("Expected a polygon");
      const ring = geometry.coordinates[0];
      expect(ring[0]).toEqual(ring.at(-1));
      expect(ring.flat().every(Number.isFinite)).toBe(true);
      expect(ring[0][0]).toBeCloseTo(4);
      expect(ring[0][1]).toBeCloseTo(53);
    }
  });

  it("imports an AnnotationPage through the binary pipeline and keeps maps separate", async () => {
    const first = georeferenceAnnotation();
    const second = georeferenceAnnotation();
    second.id = "https://example.com/annotations/map-2";
    const bytes = new TextEncoder().encode(
      JSON.stringify({ type: "AnnotationPage", items: [first, second] }),
    );
    const result = (
      await Georeference.forwardBinary(
        bytes.buffer,
        options({ points: true, layer: true, mask: true }),
      )
    ).unsafeCoerce();
    expect(result.maps.map((map) => map.name)).toEqual(["Map 1", "Map 2"]);
    expect(result.maps[1].geojson.features[0].properties?.mapId).toBe(
      second.id,
    );
    expect(
      result.maps.map((map) => parseAnnotation(map.annotation)[0].id),
    ).toEqual([first.id, second.id]);
    expect(structuredClone(result)).toEqual(result);
  });

  it("keeps the layer snapshot independent of editable point coordinates", async () => {
    const result = (
      await Georeference.forwardString(
        JSON.stringify(georeferenceAnnotation()),
        options({ points: true, layer: true, mask: false }),
      )
    ).unsafeCoerce();
    const map = result.maps[0];
    const point = map.geojson.features[0];
    if (point.geometry?.type !== "Point") throw new Error("Expected a point");
    point.geometry.coordinates[0] = 99;
    (point.properties!.resourceCoords as number[])[0] = 99;
    expect(parseAnnotation(map.annotation)[0].gcps[0]).toEqual({
      geo: [4, 53],
      resource: [0, 0],
    });
  });

  it("imports incomplete GCPs while reporting unavailable layers and masks", async () => {
    const annotation = georeferenceAnnotation();
    annotation.body.features.pop();
    const result = (
      await Georeference.forwardString(
        JSON.stringify(annotation),
        options({ points: true, layer: true, mask: true }),
      )
    ).unsafeCoerce();
    expect(result.maps[0].geojson.features).toHaveLength(2);
    expect(result.maps[0].annotation).toBeUndefined();
    expect(result.notes[0]).toContain("Not enough control points");
    expect(
      (
        await Georeference.forwardString(
          JSON.stringify(annotation),
          options({ points: false, layer: true, mask: false }),
        )
      ).isLeft(),
    ).toBe(true);
  });

  it("refines curved mask edges", async () => {
    const map = parseAnnotation(georeferenceAnnotation())[0];
    map.transformation = { type: "thinPlateSpline" };
    map.gcps.push(
      { resource: [1000, 1000], geo: [5, 52] },
      { resource: [500, 0], geo: [4.5, 53.4] },
      { resource: [500, 1000], geo: [4.5, 51.8] },
    );
    const result = (
      await Georeference.forwardString(
        JSON.stringify(generateAnnotation(map)),
        options({ points: false, layer: false, mask: true }),
      )
    ).unsafeCoerce();
    const geometry = result.maps[0].geojson.features[0].geometry;
    if (geometry?.type !== "Polygon") throw new Error("Expected a polygon");
    expect(geometry.coordinates[0].length).toBeGreaterThan(5);
  });

  it.each([
    "{",
    '{"type":"Annotation"}',
    '{"type":"AnnotationPage","items":[]}',
  ])("rejects invalid or empty input: %s", async (text) => {
    expect(
      (
        await Georeference.forwardString(
          text,
          options({ points: true, layer: false, mask: false }),
        )
      ).isLeft(),
    ).toBe(true);
  });

  it("rejects selecting no outputs", async () => {
    const result = await Georeference.forwardString(
      JSON.stringify(georeferenceAnnotation()),
      options({ points: false, layer: false, mask: false }),
    );
    expect(result.isLeft()).toBe(true);
  });

  it.each([
    ["annotation.json", ""],
    ["annotation.jsonld", ""],
    ["d180902cb93d5bf2", "application/json; charset=utf-8"],
    ["d180902cb93d5bf2", ""],
    ["download.php", "application/ld+json"],
  ])("detects annotations from %s (%s)", async (name, type) => {
    const file = new File([JSON.stringify(georeferenceAnnotation())], name, {
      type,
    });
    expect((await detectType(file)).unsafeCoerce().type).toBe("georeference");
  });

  it("detects pasted annotation pages without changing GeoJSON detection", async () => {
    expect(
      (
        await detectJson(
          JSON.stringify({
            type: "AnnotationPage",
            items: [georeferenceAnnotation()],
          }),
        )
      ).unsafeCoerce().type,
    ).toBe("georeference");
    expect(
      (
        await detectJson('{"type":"FeatureCollection","features":[]}')
      ).unsafeCoerce().type,
    ).toBe("geojson");
  });
});
