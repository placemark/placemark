import { expect, test } from "vitest";

import { getRandomMockCtxAndUser } from "test/shared";
import { getWorkOSPortalURLInner } from "./getWorkOSPortalURL";

test("getWorkOSPortalURLInner", async () => {
  const { ctx } = await getRandomMockCtxAndUser();
  await expect(
    getWorkOSPortalURLInner(ctx.session.userId!, ctx.session.orgId!)
  ).resolves.toEqual(null);
});
