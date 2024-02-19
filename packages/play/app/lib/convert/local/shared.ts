import { ZipDB } from "app/lib/get_zip_db";
import { JsonObject, JsonValue } from "type-fest";
import { z } from "zod";
import type { Unzipped } from "fflate";
import { ImportOptions } from "..";
import { env } from "app/lib/env_client";
import { GeocodeEarthResult } from "app/lib/geocode";
import { Feature } from "types";
import { wktToGeoJSON } from "betterknown";
import { parseOrError } from "app/lib/errors";
import { rough } from "app/lib/roughly_geojson";
import { Maybe } from "purify-ts/Maybe";
import { polylineToGeoJSON } from "@placemarkio/polyline";
import { Either } from "purify-ts/Either";

export const EnforcedZipOptions = z.object({
  zipHeader: z.string(),
});

export async function unzip(file: ArrayBuffer) {
  const fflate = await import("fflate");
  return await new Promise<Unzipped>((resolve, reject) => {
    fflate.unzip(new Uint8Array(file), (err, res) => {
      if (err) return reject(err);
      resolve(res);
    });
  });
}

export const EnforcedWKTOptions = z.object({
  geometryHeader: z.string(),
});

export const EnforcedLonLatOptions = z.object({
  latitudeHeader: z.string(),
  longitudeHeader: z.string(),
  autoType: z.boolean(),
});

export function getGeocodingURLSearch(
  row: JsonObject,
  options: ImportOptions["csvOptions"]
): string | null {
  const propertyName = options.geocodingHeaders.text;
  if (!propertyName) {
    throw new Error("A column must be provided for single-column geocoding.");
  }
  const text = String(row[propertyName]);
  if (!text) return null;
  const params = {
    api_key: env.NEXT_PUBLIC_GEOCODE_EARTH_TOKEN,
    text,
  };
  const queryString = new URLSearchParams(params).toString();
  return `https://api.geocode.earth/v1/search?${queryString}`;
}

export function getGeocodingURLStructured(
  row: JsonObject,
  options: ImportOptions["csvOptions"]
): string | null {
  const params: Record<string, string> = {
    api_key: env.NEXT_PUBLIC_GEOCODE_EARTH_TOKEN,
  };
  let hasHeader = false;
  for (const [key, value] of Object.entries(options.geocodingHeaders)) {
    if (key === "text") continue;
    if (value) {
      hasHeader = true;
      if (row[value]) {
        params[key] = String(row[value]);
      }
    }
  }
  if (!hasHeader) {
    throw new Error(
      "For structured geocoding, at least one column must be selected."
    );
  }
  const queryString = new URLSearchParams(params).toString();
  return `https://api.geocode.earth/v1/search/structured?${queryString}`;
}

export async function castRowGeocode(
  row: JsonObject,
  options: ImportOptions["csvOptions"]
): Promise<Feature> {
  const url =
    options.geocodingType === "search"
      ? getGeocodingURLSearch(row, options)
      : getGeocodingURLStructured(row, options);

  const nullResult = {
    type: "Feature",
    properties: row,
    geometry: null,
  } as const;

  if (!url) {
    return nullResult;
  }

  let response: Response | null = null;

  const retries = 3;
  for (let i = 0; i < retries; i++) {
    response = await fetch(url);
    if (response.ok) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  if (!response?.ok) {
    return nullResult;
  }

  const json = await response.json();
  const resp = GeocodeEarthResult.parse(json);

  if (resp.features.length) {
    const feature = resp.features[0];
    return {
      type: "Feature",
      properties: row,
      geometry: feature.geometry,
    };
  }

  return nullResult;
}

export function castRowZip(
  row: JsonObject,
  zipDb: ZipDB,
  options: z.infer<typeof EnforcedZipOptions>
): Feature | null {
  const { zipHeader } = options;
  const zipValue = String(row[zipHeader]).padStart(5, "0");
  delete row[""];
  if (zipValue && zipValue in zipDb) {
    const coordinates = zipDb[zipValue];
    return {
      type: "Feature",
      properties: row,
      geometry: {
        type: "Point",
        coordinates,
      },
    };
  }
  return null;
}

function safeParse(value: JsonValue | undefined) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return NaN;
  return parseFloat(value);
}

export function castRowWKT(
  parsedRow: JsonObject,
  options: z.infer<typeof EnforcedWKTOptions>
): Feature | null {
  const { geometryHeader } = options;
  // Numbers.app doesn't prune columns without headers.
  delete parsedRow[""];

  return Maybe.fromNullable(
    wktToGeoJSON(String(parsedRow[geometryHeader]))
  ).mapOrDefault((geometry): Feature => {
    delete parsedRow[geometryHeader];
    return {
      type: "Feature",
      properties: parsedRow,
      geometry,
    };
  }, null);
}

export function castRowPolyline(
  parsedRow: JsonObject,
  options: z.infer<typeof EnforcedWKTOptions>
): Feature | null {
  const { geometryHeader } = options;
  // Numbers.app doesn't prune columns without headers.
  delete parsedRow[""];

  return Either.encase(() =>
    polylineToGeoJSON(String(parsedRow[geometryHeader]))
  ).caseOf({
    Left() {
      return null;
    },
    Right(geometry): Feature {
      delete parsedRow[geometryHeader];
      return {
        type: "Feature",
        properties: parsedRow,
        geometry,
      };
    },
  });
}

export function castRowGeoJSON(
  parsedRow: JsonObject,
  options: z.infer<typeof EnforcedWKTOptions>
): Feature | null {
  const { geometryHeader } = options;
  // Numbers.app doesn't prune columns without headers.
  delete parsedRow[""];

  return parseOrError(String(parsedRow[geometryHeader]))
    .chain((value) => rough(value))
    .caseOf({
      Left() {
        return null;
      },
      Right(geojsonResult): Feature {
        const geometry = geojsonResult.geojson.features[0]?.geometry;
        delete parsedRow[geometryHeader];
        return {
          type: "Feature",
          properties: parsedRow,
          geometry,
        };
      },
    });
}

export function castRowLonLat(
  parsedRow: JsonObject,
  options: z.infer<typeof EnforcedLonLatOptions>
): Feature | null {
  const { latitudeHeader, longitudeHeader } = options;
  const lon = safeParse(parsedRow[longitudeHeader]);
  const lat = safeParse(parsedRow[latitudeHeader]);
  // Numbers.app doesn't prune columns without headers.
  delete parsedRow[""];

  if (isNaN(lon) || isNaN(lat)) {
    // TODO: handle errors
    // errors.push({
    //   message: "A row contained an invalid value for latitude or longitude",
    //   row: parsed[i],
    //   index: i,
    // });
  } else {
    delete parsedRow[longitudeHeader];
    delete parsedRow[latitudeHeader];

    return {
      type: "Feature",
      properties: parsedRow,
      geometry: {
        type: "Point",
        coordinates: [lon, lat],
      },
    };
  }
  return null;
}
