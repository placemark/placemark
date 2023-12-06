import { expect, describe, it } from "vitest";

import { UIDMap } from "app/lib/id_mapper";
import { Data } from "state/jotai";
import * as keys from "app/lib/replicache/keys";
import { SELECTION_NONE, USelection } from "state/uselection";
import { applyDiff } from "./use_watch_callback";
import { fcLineString, wrapMap } from "test/helpers";

function emptyData(): Data {
  return {
    featureMap: new Map(),
    folderMap: new Map(),
    selection: SELECTION_NONE,
  };
}

const wrappedFeatureCollectionId = "xyz";

describe("applyDiff", () => {
  it("null case", () => {
    expect(
      applyDiff(
        emptyData(),
        new Map(),
        wrappedFeatureCollectionId,
        [],
        { current: UIDMap.empty() },
        1,
        new Map()
      )
    ).toEqual({});
  });

  it("remove selected feature", () => {
    const id = "000000000000000000000";
    const res = applyDiff(
      {
        featureMap: wrapMap(fcLineString),
        folderMap: new Map(),
        selection: USelection.single(id),
      },
      new Map(),
      "xyz",
      [
        {
          key: keys.feature({
            wrappedFeatureCollectionId,
            id,
          }),
          op: "del",
          oldValue: {
            id,
            hello: "world",
          },
        },
      ],
      { current: UIDMap.empty() },
      1,
      new Map()
    );

    expect(res.dataAtom?.featureMap).toBeInstanceOf(Map);
    expect(res).toHaveProperty(["dataAtom", "selection"], { type: "none" });
  });

  it("single feature", () => {
    const res = applyDiff(
      emptyData(),
      new Map(),
      "xyz",
      [
        {
          key: keys.feature({ wrappedFeatureCollectionId, id: "xxx" }),
          op: "add",
          newValue: {
            id: "xxx",
            hello: "world",
          },
        },
      ],
      { current: UIDMap.empty() },
      1,
      new Map()
    );

    expect(new Map(res.dataAtom?.featureMap)).toEqual(
      new Map([["xxx", { hello: "world", id: "xxx" }]])
    );
  });

  it("add and delete", () => {
    const res = applyDiff(
      emptyData(),
      new Map(),
      "xyz",
      [
        {
          key: keys.feature({ wrappedFeatureCollectionId, id: "xxx" }),
          op: "add",
          newValue: {
            id: "xxx",
            hello: "world",
          },
        },
        {
          key: keys.feature({ wrappedFeatureCollectionId, id: "xxx" }),
          op: "del",
          oldValue: {
            id: "xxx",
            hello: "world",
          },
        },
      ],
      { current: UIDMap.empty() },
      1,
      new Map()
    );
    expect(new Map(res.dataAtom?.featureMap)).toEqual(new Map());
  });
});
