import { expect, describe, it, vi } from "vitest";

import getCanAccessWrappedFeatureCollection from "./getCanAccessWrappedFeatureCollection";
import createWrappedFeatureCollection from "app/wrappedFeatureCollections/mutations/createWrappedFeatureCollection";
import { getRandomMockCtxAndUser } from "test/shared";
import { NotFoundError } from "blitz";

vi.mock("blitz", async () => ({
  ...(await vi.importActual<object>("blitz")),
  generateToken: () => "plain-token",
}));

describe("getCanAccessWrappedFeatureCollection", () => {
  it("true for wfcs you can access", async () => {
    const { ctx } = await getRandomMockCtxAndUser();
    const id = await createWrappedFeatureCollection({ name: "Foo" }, ctx);
    await expect(
      getCanAccessWrappedFeatureCollection({ id: id }, ctx)
    ).resolves.toBeTruthy();
  });
  it("false for bad id", async () => {
    const { ctx } = await getRandomMockCtxAndUser();
    await expect(
      getCanAccessWrappedFeatureCollection({ id: "test" }, ctx)
    ).rejects.toThrowError(NotFoundError);
  });
});
