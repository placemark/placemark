import { describe, expect, it } from "vitest";
import { DEFAULT_EXPORT_OPTIONS } from ".";
import { GPX } from "./gpx";
import { KML } from "./kml";

const GPX_WITH_ELEVATION = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="test" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>track</name>
    <trkseg>
      <trkpt lat="47.3769" lon="8.5417"><ele>408.0</ele></trkpt>
      <trkpt lat="47.5" lon="8.7"><ele>2500.0</ele></trkpt>
      <trkpt lat="47.6" lon="8.9"><ele>3100.0</ele></trkpt>
    </trkseg>
  </trk>
</gpx>`;

describe("KML", () => {
  it("keeps altitude when exporting a GPX track with elevation", async () => {
    const res = (await GPX.forwardString(GPX_WITH_ELEVATION)).unsafeCoerce();
    expect(res.type).toBe("geojson");
    if (res.type !== "geojson") return;
    expect(res.geojson.features[0].geometry).toEqual({
      type: "LineString",
      coordinates: [
        [8.5417, 47.3769, 408],
        [8.7, 47.5, 2500],
        [8.9, 47.6, 3100],
      ],
    });
    const featureMap = new Map();
    for (const feature of res.geojson.features) {
      const id = "f1";
      featureMap.set(id, {
        feature,
        at: "a0",
        folderId: null,
        id,
      });
    }
    const exported = (
      await KML.back(
        {
          geojson: res.geojson,
          featureMap: featureMap as never,
          folderMap: new Map(),
        },
        DEFAULT_EXPORT_OPTIONS,
      )
    ).unsafeCoerce();
    const text = await exported.blob.text();
    expect(text).toContain("8.5417,47.3769,408");
    expect(text).toContain("8.7,47.5,2500");
    expect(text).toContain("8.9,47.6,3100");
  });
});
