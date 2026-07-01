import { multiLineString, point, wrapMap } from "test/helpers";
import { describe, expect, it, test } from "vitest";
import {
  filterFeatures,
  measureColumn,
  replaceFeatureProperties,
} from "./feature_table";

const folderId1 = "00000000-0000-0000-0000-000000000000";
const folderId2 = "00000000-0000-0000-0000-000000000001";

const columns = ["name", "description"];

const folderIds = [folderId1, folderId2, null];
const featureMap = new Map(
  [
    ...wrapMap({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            name: "Buttermilk Bakeshop",
            description: "Striped awning",
          },
          geometry: point,
        },
        {
          type: "Feature",
          properties: { name: "LS Barbershop", description: "Black sign" },
          geometry: point,
        },
        {
          type: "Feature",
          properties: { street: "Garfield Pl.", description: "Great street" },
          geometry: multiLineString,
        },
      ],
    }).entries(),
  ].map(([key, value], i) => {
    return [
      key,
      {
        ...value,
        folderId: folderIds[i],
      },
    ];
  }),
);

const wrappedFeatures = Array.from(featureMap.values());

test("measureColumn", () => {
  expect(measureColumn("name", featureMap)).toEqual(140);
  expect(measureColumn("description", featureMap)).toEqual(140);
  expect(measureColumn("baz", featureMap)).toEqual(64);
  expect(measureColumn("baz", new Map())).toEqual(64);
});

describe("filterFeatures", () => {
  it("should return all features when no filter is provided", () => {
    expect(
      filterFeatures({
        filter: {
          search: "",
          isCaseSensitive: false,
          column: "",
          geometryType: null,
          folderId: null,
          exact: false,
          sort: null,
        },
        columns,
        featureMap,
      }),
    ).toEqual(wrappedFeatures);
  });

  it("should filter features by search text", () => {
    expect(
      filterFeatures({
        filter: {
          search: "Ba",
          isCaseSensitive: false,
          column: "",
          geometryType: null,
          folderId: null,
          exact: false,
          sort: null,
        },
        columns,
        featureMap,
      }),
    ).toEqual([wrappedFeatures[1], wrappedFeatures[0]]);
  });

  it("should filter features by geometry type", () => {
    expect(
      filterFeatures({
        filter: {
          search: "",
          isCaseSensitive: false,
          column: "",
          geometryType: "MultiLineString",
          folderId: null,
          exact: false,
          sort: null,
        },
        columns,
        featureMap,
      }),
    ).toEqual([wrappedFeatures[2]]);
  });

  it("should filter features by folder", () => {
    expect(
      filterFeatures({
        filter: {
          search: "",
          isCaseSensitive: false,
          column: "",
          geometryType: null,
          folderId: folderId1,
          exact: false,
          sort: null,
        },
        columns,
        featureMap,
      }),
    ).toEqual([wrappedFeatures[0]]);
  });

  it("should filter features by folder and search text", () => {
    expect(
      filterFeatures({
        filter: {
          search: "Ba",
          isCaseSensitive: false,
          column: "",
          geometryType: null,
          folderId: folderId1,
          exact: false,
          sort: null,
        },
        columns,
        featureMap,
      }),
    ).toEqual([wrappedFeatures[0]]);
  });
});

describe("replaceFeatureProperties", () => {
  it("should replace matching string properties", () => {
    const replacedFeatures = replaceFeatureProperties({
      features: wrappedFeatures,
      columns: ["name", "description", "street"],
      column: null,
      search: "shop",
      replace: "store",
      isCaseSensitive: false,
    });

    expect(replacedFeatures).toHaveLength(2);
    expect(replacedFeatures[0].feature.properties).toMatchObject({
      name: "Buttermilk Bakestore",
    });
    expect(replacedFeatures[1].feature.properties).toMatchObject({
      name: "LS Barberstore",
    });
  });

  it("should replace only the selected column", () => {
    const replacedFeatures = replaceFeatureProperties({
      features: wrappedFeatures,
      columns: ["name", "description"],
      column: "description",
      search: "shop",
      replace: "store",
      isCaseSensitive: false,
    });

    expect(replacedFeatures).toHaveLength(0);
  });

  it("should honor case sensitivity", () => {
    const replacedFeatures = replaceFeatureProperties({
      features: wrappedFeatures,
      columns: ["name"],
      column: null,
      search: "SHOP",
      replace: "store",
      isCaseSensitive: true,
    });

    expect(replacedFeatures).toHaveLength(0);
  });

  it("should treat regex characters as literal search text", () => {
    const replacedFeatures = replaceFeatureProperties({
      features: wrappedFeatures,
      columns: ["street"],
      column: null,
      search: "Pl.",
      replace: "Place",
      isCaseSensitive: true,
    });

    expect(replacedFeatures).toHaveLength(1);
    expect(replacedFeatures[0].feature.properties).toMatchObject({
      street: "Garfield Place",
    });
  });
});
