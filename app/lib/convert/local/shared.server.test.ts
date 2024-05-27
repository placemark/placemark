import { expect, vi, test } from "vitest";

vi.mock("app/lib/env_client", () => {
  return {
    env: {
      NEXT_PUBLIC_GEOCODE_EARTH_TOKEN: "xxx",
    },
  };
});

import { DEFAULT_IMPORT_OPTIONS } from "..";
import { getGeocodingURLSearch, getGeocodingURLStructured } from "./shared";

test("getGeocodingURLSearch", () => {
  expect(
    getGeocodingURLSearch(
      {
        text: "Foo",
      },
      {
        ...DEFAULT_IMPORT_OPTIONS.csvOptions,
        geocodingHeaders: {
          ...DEFAULT_IMPORT_OPTIONS.csvOptions.geocodingHeaders,
          text: "text",
        },
      }
    )
  ).toMatchInlineSnapshot(
    `"https://api.geocode.earth/v1/search?api_key=xxx&text=Foo"`
  );
  expect(() =>
    getGeocodingURLSearch(
      {
        text: "Foo",
      },
      {
        ...DEFAULT_IMPORT_OPTIONS.csvOptions,
        geocodingHeaders: {
          ...DEFAULT_IMPORT_OPTIONS.csvOptions.geocodingHeaders,
        },
      }
    )
  ).toThrowError();
});

test("getGeocodingURLSearch", () => {
  expect(
    getGeocodingURLStructured(
      {
        a: "Foo",
        c: "Bar",
      },
      {
        ...DEFAULT_IMPORT_OPTIONS.csvOptions,
        geocodingHeaders: {
          ...DEFAULT_IMPORT_OPTIONS.csvOptions.geocodingHeaders,
          address: "a",
          locality: "c",
        },
      }
    )
  ).toMatchInlineSnapshot(
    `"https://api.geocode.earth/v1/search/structured?api_key=xxx&address=Foo&locality=Bar"`
  );
  expect(() =>
    getGeocodingURLStructured(
      {
        text: "Foo",
      },
      {
        ...DEFAULT_IMPORT_OPTIONS.csvOptions,
        geocodingHeaders: {
          ...DEFAULT_IMPORT_OPTIONS.csvOptions.geocodingHeaders,
        },
      }
    )
  ).toThrowError();
});
