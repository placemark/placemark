import { fcTwoPoly, wrapMap } from "test/helpers";
import { expect, test } from "vitest";
import {
  getNumericPropertyMap,
  getViablePropertiesForCategorical,
} from "./symbolization_editor";

test("getViablePropertiesForCategorical", () => {
  expect(
    getViablePropertiesForCategorical(wrapMap(fcTwoPoly)),
  ).toMatchInlineSnapshot(`
    Map {
      "x" => Set {
        1,
      },
      "hello" => Set {
        "World",
      },
    }
  `);
  expect(getViablePropertiesForCategorical(new Map())).toMatchInlineSnapshot(
    `Map {}`,
  );
});

test("getNumericPropertyMap", () => {
  expect(getNumericPropertyMap(wrapMap(fcTwoPoly))).toMatchInlineSnapshot(`
    Map {
      "x" => [
        1,
        1,
      ],
    }
  `);
  expect(getNumericPropertyMap(new Map())).toMatchInlineSnapshot(`Map {}`);
});
