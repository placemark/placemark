import type { FeatureCollection, Feature } from "types";
import {
  DEFAULT_IMPORT_OPTIONS,
  GeocodingBehavior,
  ImportOptions,
  ProgressCb,
} from "app/lib/convert";
import type { DSVRowString } from "d3-dsv";
import { dsvFormat } from "d3-dsv";
import { getZipDB, ZipDB } from "app/lib/get_zip_db";
import {
  castRowGeocode,
  castRowLonLat,
  castRowWKT,
  castRowGeoJSON,
  castRowPolyline,
  castRowZip,
  EnforcedLonLatOptions,
  EnforcedWKTOptions,
  EnforcedZipOptions,
} from "./shared";
import { JsonObject, JsonValue } from "type-fest";
import { MAX_GEOCODER_ROWS } from "app/lib/constants";

interface Scores {
  latitudeScore: number;
  longitudeScore: number;
  zipScore: number;
  addressScore: number;
  localityScore: number;
  countryScore: number;
  countyScore: number;
  postalcodeScore: number;
}

type ColumnWithScore = {
  column: string;
} & Scores;

// https://github.com/d3/d3-dsv#autoType
export function autoType(
  input: DSVRowString,
  options: ImportOptions["csvOptions"]
): JsonObject {
  const object = input as JsonObject;
  for (const key in object) {
    let value: JsonValue = (object[key] as string).trim();
    if (options.kind === "zip" && key === options.zipHeader) {
      object[key] = value;
      continue;
    }
    let number;
    if (!value) value = null;
    else if (value === "true") value = true;
    else if (value === "false") value = false;
    else if (!isNaN((number = +value))) value = number;
    else continue;
    object[key] = value;
  }
  return object;
}

function sortByScore(
  columnsWithScores: ColumnWithScore[],
  scoreKey: keyof Scores
) {
  const [winner] = columnsWithScores
    .filter((column) => column[scoreKey] > 0)
    .sort((b, a) => a[scoreKey] - b[scoreKey]);
  return winner;
}

const goodZipHeaders = new Set(["zip", "zip code"]);

export function detectColumns(columns: string[]): ImportOptions["csvOptions"] {
  const columnsWithScores: ColumnWithScore[] = columns.map((column) => {
    return {
      column,
      latitudeScore: scoreColumn(column, /(Lat)(itude)?/gi),
      longitudeScore: scoreColumn(column, /(L)(on|ng)(gitude)?/gi),
      addressScore: scoreColumn(column, /address?/gi),
      countryScore: scoreColumn(column, /country?/gi),
      localityScore: scoreColumn(column, /city?/gi),
      countyScore: scoreColumn(column, /county?/gi),
      postalcodeScore: scoreColumn(column, /(postalcode|postcode|post)?/gi),
      zipScore: scoreColumn(column, /zip/gi),
    };
  });

  /**
   * Lazy way to do this here, but if there's a polyline
   * header, it's probably a polyline, and there's no real alternative
   * name for that.
   */
  const hasPolylineColumn = columns.includes("polyline");
  const hasWktColumn = columns.includes("wkt");

  const latitudeHeader = sortByScore(columnsWithScores, "latitudeScore");
  const longitudeHeader = sortByScore(columnsWithScores, "longitudeScore");
  const zipHeader = sortByScore(columnsWithScores, "zipScore");

  const addressHeader = sortByScore(columnsWithScores, "addressScore");
  const localityHeader = sortByScore(columnsWithScores, "localityScore");
  const countryHeader = sortByScore(columnsWithScores, "countryScore");
  const postalcodeHeader = sortByScore(columnsWithScores, "postalcodeScore");

  /**
   * This tries to work around a really tricky case in which
   * there's a single column, so it's not possible to really 'reset'
   * any fields.
   */
  const singleColumn = (columns.length === 1 && columns[0]) || "";

  return {
    kind: hasPolylineColumn
      ? "polyline"
      : hasWktColumn
      ? "wkt"
      : latitudeHeader?.column === longitudeHeader?.column ||
        goodZipHeaders.has(zipHeader?.column?.toLowerCase())
      ? "zip"
      : "lonlat",
    delimiter: ",",
    latitudeHeader: latitudeHeader?.column || singleColumn,
    longitudeHeader: longitudeHeader?.column || singleColumn,
    geometryHeader: hasPolylineColumn
      ? "polyline"
      : hasWktColumn
      ? "wkt"
      : singleColumn,
    joinTargetHeader: singleColumn,
    joinSourceHeader: singleColumn,
    sheet: "",
    autoType: true,
    zipHeader: zipHeader?.column || singleColumn,
    geocodingBehavior: GeocodingBehavior.NULL_GEOMETRY,
    geocodingType: countryHeader ? "structured" : "search",
    geocodingHeaders: {
      ...DEFAULT_IMPORT_OPTIONS.csvOptions.geocodingHeaders,
      country: countryHeader?.column || singleColumn,
      address: addressHeader?.column || singleColumn,
      locality: localityHeader?.column || singleColumn,
      text: addressHeader?.column || singleColumn,
      postalcode: postalcodeHeader?.column || singleColumn,
    },
  };
}

function scoreColumn(column: string, regex: RegExp) {
  const match = regex.exec(column);
  return match ? match[0].length : 0;
}

export async function csvToGeoJSON(
  csv: string,
  options: ImportOptions["csvOptions"],
  progress: ProgressCb
): Promise<FeatureCollection> {
  if (!options) throw new Error("Options should not be undefined");
  const { kind, delimiter } = options;

  let zipDb: ZipDB;
  let i = 0;
  const rows = dsvFormat(delimiter).parse(csv);
  const features: Feature[] = [];

  // Preflight checks
  switch (kind) {
    case "zip": {
      zipDb = await getZipDB();
      break;
    }
    case "addresses": {
      if (rows.length > MAX_GEOCODER_ROWS) {
        throw new Error(
          `Up to ${MAX_GEOCODER_ROWS} rows are supported for the address type`
        );
      }
      break;
    }
    case "geojson":
    case "wkt":
    case "join":
    case "polyline":
    case "lonlat": {
      break;
    }
  }

  progress({ total: rows.length, done: 0 });

  for (const row of rows) {
    const castRow: JsonObject = options.autoType
      ? autoType(row, options)
      : (row as JsonObject);
    switch (kind) {
      case "lonlat": {
        const feature = castRowLonLat(
          castRow,
          EnforcedLonLatOptions.parse(options)
        );
        if (feature) {
          features.push(feature);
        }
        break;
      }
      case "wkt": {
        const feature = castRowWKT(castRow, EnforcedWKTOptions.parse(options));
        if (feature) {
          features.push(feature);
        }
        break;
      }
      case "geojson": {
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
        const feature = castRowPolyline(
          castRow,
          EnforcedWKTOptions.parse(options)
        );
        if (feature) {
          features.push(feature);
        }
        break;
      }
      case "zip": {
        const feature = castRowZip(
          castRow,
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
        const feature = await castRowGeocode(castRow, options);
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
          properties: castRow,
        });
        break;
      }
    }
    progress({ total: rows.length, done: ++i });
  }

  return {
    type: "FeatureCollection",
    features: features,
  };
}
