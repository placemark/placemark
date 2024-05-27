import { expect, describe, it, test } from "vitest";

import { USelection } from "state";
import { exampleFolder, fcLineString, wrapMap } from "test/helpers";
import { solveRootItems, getRequiredExpansionsFeature } from "./math";

test("solveRootItems", () => {
  expect(solveRootItems(new Map(), new Map())).toEqual({
    children: [],
    type: "root",
  });
});

describe("getRequiredExpansionsFeature", () => {
  it("feature at the root level", () => {
    const m = wrapMap(fcLineString);
    const id = [...m.keys()][0];
    const selection = USelection.single(id);
    expect(
      getRequiredExpansionsFeature(selection, {
        featureMap: m,
        folderMap: new Map(),
        selection,
      })
    ).toEqual([]);
  });

  it("feature in an expanded folder", () => {
    const m = wrapMap(fcLineString);
    const id = [...m.keys()][0];
    m.set(id, { ...m.get(id)!, folderId: exampleFolder.id });
    const selection = USelection.single(id);
    expect(
      getRequiredExpansionsFeature(selection, {
        featureMap: m,
        folderMap: new Map([[exampleFolder.id, exampleFolder]]),
        selection,
      })
    ).toEqual([]);
  });

  it("feature in a collapsed folder", () => {
    const m = wrapMap(fcLineString);
    const id = [...m.keys()][0];
    const collapsedFolder = { ...exampleFolder, expanded: false };
    m.set(id, { ...m.get(id)!, folderId: collapsedFolder.id });
    const selection = USelection.single(id);
    expect(
      getRequiredExpansionsFeature(selection, {
        featureMap: m,
        folderMap: new Map([[collapsedFolder.id, collapsedFolder]]),
        selection,
      })
    ).toEqual([collapsedFolder]);
  });
});
