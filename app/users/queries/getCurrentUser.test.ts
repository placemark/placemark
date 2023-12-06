import { expect, describe, it } from "vitest";

import { AuthenticatedMiddlewareCtx } from "blitz";
import { getRandomMockCtxAndUser } from "test/shared";
import { getCurrentUserInternal } from "./getCurrentUser";

describe("getCurrentUser", () => {
  it("base case", async () => {
    const { ctx } = await getRandomMockCtxAndUser();
    await expect(
      getCurrentUserInternal(ctx as AuthenticatedMiddlewareCtx)
    ).resolves.toBeTruthy();
  });
});
