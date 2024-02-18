import { expect, describe, it } from "vitest";

import getOrganization from "./getOrganization";
import { getRandomMockCtxAndUser } from "test/shared";

describe("getWrappedFeatureCollection", () => {
  it("returns a created feature collection", async () => {
    const { ctx } = await getRandomMockCtxAndUser();
    await expect(getOrganization({}, ctx)).resolves.toMatchObject({
      organization: {
        name: "My Team",
      },
    });
  });
});
