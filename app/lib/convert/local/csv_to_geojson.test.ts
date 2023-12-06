import { expect, describe, it } from "vitest";

import { DEFAULT_IMPORT_OPTIONS } from "..";
import { csvToGeoJSON, autoType, detectColumns } from "./csv_to_geojson";
import * as Comlink from "comlink";

const noop = Comlink.proxy(() => {});

const output = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "Null island" },
      geometry: {
        type: "Point",
        coordinates: [0, 0],
      },
    },
  ],
};

describe("csvToGeoJSON", () => {
  it("autoType", () => {
    expect(
      autoType(
        {
          n: "10",
          x: "true",
          y: "",
        },
        DEFAULT_IMPORT_OPTIONS.csvOptions
      )
    ).toEqual({
      n: 10,
      x: true,
      y: null,
    });
  });
  it("handles comma-separated values", async () => {
    await expect(
      csvToGeoJSON(
        `name,lat,lon
Null island,0,0`,
        {
          ...DEFAULT_IMPORT_OPTIONS.csvOptions,
          delimiter: ",",
          latitudeHeader: "lat",
          longitudeHeader: "lon",
          zipHeader: "",
          autoType: true,
          sheet: "",
          kind: "lonlat",
        },
        noop
      )
    ).resolves.toEqual(output);
  });

  it.skip("handles zip codes", async () => {
    await expect(
      csvToGeoJSON(
        `name,zip
Null island,94110`,
        {
          ...DEFAULT_IMPORT_OPTIONS.csvOptions,
          delimiter: ",",
          latitudeHeader: "lat",
          longitudeHeader: "lon",
          autoType: true,
          sheet: "",
          zipHeader: "zip",
          kind: "zip",
        },
        noop
      )
    ).resolves.toEqual({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { name: "Null island", zip: "94110" },
          geometry: {
            type: "Point",
            coordinates: [-122.415201, 37.750021],
          },
        },
      ],
    });
  });

  it("handles semicolon-separated values", async () => {
    await expect(
      csvToGeoJSON(
        `name;latitude;longitude
Null island;0;0`,
        {
          ...DEFAULT_IMPORT_OPTIONS.csvOptions,
          delimiter: ";",
          latitudeHeader: "latitude",
          longitudeHeader: "longitude",
          autoType: true,
          zipHeader: "",
          sheet: "",
          kind: "lonlat",
        },
        noop
      )
    ).resolves.toEqual(output);
  });

  it("casts types", async () => {
    const geojson = await csvToGeoJSON(
      `name;count;n;latitude;longitude
Null island;10;true;0;0`,
      {
        ...DEFAULT_IMPORT_OPTIONS.csvOptions,
        delimiter: ";",
        latitudeHeader: "latitude",
        longitudeHeader: "longitude",
        autoType: true,
        zipHeader: "",
        sheet: "",
        kind: "lonlat",
      },
      noop
    );
    expect(geojson).toHaveProperty("features.0.properties.count", 10);
    expect(geojson).toHaveProperty("features.0.properties.n", true);
  });
});

describe("detect columns", () => {
  it("lat lon", () => {
    expect(detectColumns(["name", "lat", "lon"])).toEqual({
      autoType: true,
      sheet: "",
      delimiter: ",",
      latitudeHeader: "lat",
      longitudeHeader: "lon",
      zipHeader: "",
      joinSourceHeader: "",
      joinTargetHeader: "",
      geometryHeader: "",
      kind: "lonlat",
      geocodingBehavior: 0,
      geocodingHeaders: {
        address: "",
        borough: "",
        country: "",
        county: "",
        locality: "",
        neighbourhood: "",
        postalcode: "",
        region: "",
        text: "",
      },
      geocodingType: "search",
    });
  });
  it("distinct types", () => {
    expect(detectColumns(["name", "wkt"])).toHaveProperty(["kind"], "wkt");
    expect(detectColumns(["name", "wkt"])).toHaveProperty(
      ["geometryHeader"],
      "wkt"
    );
    expect(detectColumns(["name", "polyline"])).toHaveProperty(
      ["kind"],
      "polyline"
    );
    expect(detectColumns(["name", "polyline"])).toHaveProperty(
      ["geometryHeader"],
      "polyline"
    );
  });
  it("typos", () => {
    expect(detectColumns(["name", "elatation", "latitude", "lon"])).toEqual({
      autoType: true,
      sheet: "",
      delimiter: ",",
      latitudeHeader: "latitude",
      longitudeHeader: "lon",
      zipHeader: "",
      joinSourceHeader: "",
      joinTargetHeader: "",
      geometryHeader: "",
      kind: "lonlat",
      geocodingBehavior: 0,
      geocodingHeaders: {
        address: "",
        borough: "",
        country: "",
        county: "",
        locality: "",
        neighbourhood: "",
        postalcode: "",
        region: "",
        text: "",
      },
      geocodingType: "search",
    });
  });

  it("zip codes", () => {
    expect(detectColumns(["name", "zip code"])).toEqual({
      autoType: true,
      sheet: "",
      delimiter: ",",
      latitudeHeader: "",
      longitudeHeader: "",
      joinSourceHeader: "",
      joinTargetHeader: "",
      geometryHeader: "",
      zipHeader: "zip code",
      kind: "zip",
      geocodingBehavior: 0,
      geocodingHeaders: {
        address: "",
        borough: "",
        country: "",
        county: "",
        locality: "",
        neighbourhood: "",
        postalcode: "",
        region: "",
        text: "",
      },
      geocodingType: "search",
    });
  });
});
