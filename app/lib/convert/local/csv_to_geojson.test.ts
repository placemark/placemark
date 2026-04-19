import * as Comlink from "comlink";
import { describe, expect, it } from "vitest";
import { DEFAULT_IMPORT_OPTIONS } from "..";
import { autoType, csvToGeoJSON, detectColumns } from "./csv_to_geojson";

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
        DEFAULT_IMPORT_OPTIONS.csvOptions,
      ),
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
        noop,
      ),
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
        noop,
      ),
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
        noop,
      ),
    ).resolves.toEqual(output);
  });

  it("handles h3 values", async () => {
    await expect(
      csvToGeoJSON(
        `name,h3
Null island,8928308280fffff`,
        {
          ...DEFAULT_IMPORT_OPTIONS.csvOptions,
          delimiter: ",",
          autoType: true,
          h3Header: "h3",
          sheet: "",
          kind: "h3",
        },
        noop,
      ),
    ).resolves.toEqual({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            name: "Null island",
            h3: "8928308280fffff",
          },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [-122.41719971841658, 37.775197782893386],
                [-122.41612835779266, 37.77688044840227],
                [-122.41738797617619, 37.77838500493093],
                [-122.41971895414808, 37.77820687262238],
                [-122.4207902454188, 37.776524206993216],
                [-122.41953062807342, 37.77501967379261],
                [-122.41719971841658, 37.775197782893386],
              ],
            ],
          },
        },
      ],
    });
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
      noop,
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
      h3Header: "",
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
      "wkt",
    );
    expect(detectColumns(["name", "polyline"])).toHaveProperty(
      ["kind"],
      "polyline",
    );
    expect(detectColumns(["name", "polyline"])).toHaveProperty(
      ["geometryHeader"],
      "polyline",
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
      h3Header: "",
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
      h3Header: "",
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

  it("h3 values", () => {
    expect(detectColumns(["name", "h3_id"])).toEqual({
      autoType: true,
      sheet: "",
      delimiter: ",",
      latitudeHeader: "",
      longitudeHeader: "",
      joinSourceHeader: "",
      joinTargetHeader: "",
      geometryHeader: "",
      zipHeader: "",
      h3Header: "h3_id",
      kind: "h3",
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
