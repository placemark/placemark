import type { FeatureCollection, Feature } from "types";
import type { ImportOptions } from "app/lib/convert";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { JsonObject } from "type-fest";
import { read, utils } from "xlsx";
import { getZipDB, ZipDB } from "app/lib/get_zip_db";
import {
  castRowGeocode,
  castRowGeoJSON,
  castRowLonLat,
  castRowPolyline,
  castRowWKT,
  castRowZip,
  EnforcedLonLatOptions,
  EnforcedWKTOptions,
  EnforcedZipOptions,
} from "./shared";

export async function xlsxToGeoJSON(
  file: ArrayBuffer,
  options: ImportOptions["csvOptions"]
): Promise<FeatureCollection> {
  if (!options) throw new Error("Options should not be undefined");
  const { kind, sheet } = options;

  let zipDb: ZipDB;

  if (kind === "zip") {
    zipDb = await getZipDB();
  }

  const doc = read(file, { type: "array" });
  const rows: JsonObject[] = utils.sheet_to_json(doc.Sheets[sheet]);
  const features: Feature[] = [];

  for (const row of rows) {
    switch (kind) {
      case "lonlat": {
        const feature = castRowLonLat(
          row,
          EnforcedLonLatOptions.parse(options)
        );
        if (feature) {
          features.push(feature);
        }
        break;
      }
      case "zip": {
        const feature = castRowZip(
          row,
          zipDb!,
          EnforcedZipOptions.parse(options)
        );
        if (feature) {
          features.push(feature);
        }
        break;
      }
      case "addresses": {
        await new Promise((resolve) => setTimeout(resolve, 100));
        const feature = await castRowGeocode(row, options);
        if (feature) {
          features.push(feature);
        }
        break;
      }
      case "wkt": {
        const castRow = row;
        const feature = castRowWKT(castRow, EnforcedWKTOptions.parse(options));
        if (feature) {
          features.push(feature);
        }
        break;
      }
      case "geojson": {
        const castRow = row;
        const feature = castRowGeoJSON(
          castRow,
          EnforcedWKTOptions.parse(options)
        );
        if (feature) {
          features.push(feature);
        }
        break;
      }
      case "polyline": {
        const castRow = row;
        const feature = castRowPolyline(
          castRow,
          EnforcedWKTOptions.parse(options)
        );
        if (feature) {
          features.push(feature);
        }
        break;
      }
      case "join": {
        // Make this a valid feature without a geometry:
        // when you're joining data, you join against
        // existing features / geometries, so if this was architected
        // a different way, we might just return the object only.
        features.push({
          type: "Feature",
          geometry: null,
          properties: row,
        });
        break;
      }
    }
  }

  return {
    type: "FeatureCollection",
    features: features,
  };
}
