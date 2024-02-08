import { expect, test } from "vitest";

import { parseSymbolization } from "./utils_server";
import { SYMBOLIZATION_NONE } from "types";

test("parseSymbolization", () => {
  expect(parseSymbolization({})).toEqual(SYMBOLIZATION_NONE);
});
