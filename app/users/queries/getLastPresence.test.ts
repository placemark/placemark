import { expect, describe, it } from "vitest";

import createWrappedFeatureCollection from "app/wrappedFeatureCollections/mutations/createWrappedFeatureCollection";
import { getRandomMockCtxAndUser } from "test/shared";
import { getLastPresenceInner } from "./getLastPresence";

describe("getLastPresence", () => {
  it("base case", async () => {
    const { ctx } = await getRandomMockCtxAndUser();
    const id = await createWrappedFeatureCollection({ name: "Foo" }, ctx);
    await expect(
      getLastPresenceInner(id, ctx.session.userId!)
    ).resolves.toBeNull();
  });
});
