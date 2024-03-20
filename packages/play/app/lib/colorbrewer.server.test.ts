import { expect, test } from "vitest";

import { COLORBREWER_ALL } from "./colorbrewer";
import groupBy from "lodash/groupBy";

test("id collisions", () => {
  const groups = Object.values(
    groupBy(COLORBREWER_ALL, (color) => color.name)
  ).filter((group) => group.length > 1);
  expect(groups).toHaveLength(0);
});
