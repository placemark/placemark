import { expect, describe, it } from "vitest";

import { createSkipSet } from "app/lib/create_skip_set";
import { putFeaturesContent, putPresenceContent } from "test/helpers";

describe("createSkipSet", () => {
  it("base case", () => {
    expect([...createSkipSet([])]).toEqual([]);
  });
  it("single putPresence", () => {
    const putPresence = putPresenceContent(1, 0, "xxx");
    expect([...createSkipSet([putPresence])]).toEqual([]);
  });
  it("successive putPresence", () => {
    const putPresence = putPresenceContent(1, 0, "xxx");
    const putPresence2 = putPresenceContent(1, 0, "xxx");
    const res = [...createSkipSet([putPresence, putPresence2])];
    expect(res).toHaveLength(1);
    expect(res[0]).toBe(putPresence);
  });
  it("single putFeatures", () => {
    const putFeatures = putFeaturesContent(1, "xxx");
    expect([...createSkipSet([putFeatures])]).toEqual([]);
  });
  it("multiple putFeatures", () => {
    const putFeatures = putFeaturesContent(1, "xxx");
    const putFeatures2 = putFeaturesContent(1, "xxx");
    const res = [...createSkipSet([putFeatures, putFeatures2])];
    expect(res).toHaveLength(1);
    expect(res[0]).toBe(putFeatures);
  });
  it("multiple putFeatures targeting different featuers", () => {
    const putFeatures = putFeaturesContent(1, "xxx");
    const putFeatures2 = putFeaturesContent(1, "xxx", "qqq");
    expect([...createSkipSet([putFeatures, putFeatures2])]).toEqual([]);
  });
  it("interleaved alternative feature", () => {
    const putFeatures = putFeaturesContent(1, "xxx");
    const putFeatures1 = putFeaturesContent(1, "xxx", "qqq");
    const putFeatures2 = putFeaturesContent(1, "xxx");
    const res = [...createSkipSet([putFeatures, putFeatures1, putFeatures2])];
    expect(res).toHaveLength(1);
    expect(res[0]).toBe(putFeatures);
  });
});
