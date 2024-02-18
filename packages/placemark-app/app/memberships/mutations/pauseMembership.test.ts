import { beforeAll, expect, describe, it } from "vitest";

import pauseMemberships from "app/memberships/mutations/pauseMemberships";
import { getRandomMockCtxAndUser } from "test/shared";
import db from "db";

beforeAll(() => {
  (global as any).sessionConfig = {
    getSessions() {
      return [];
    },
  };
});

describe("pauseMemberships", () => {
  it("pauses a membership", async () => {
    const { ctx, user } = await getRandomMockCtxAndUser();
    await expect(
      db.membership.findFirst({
        where: {
          userId: user.id,
        },
      })
    ).resolves.toHaveProperty("membershipStatus", "ACTIVE");
    await expect(pauseMemberships({}, ctx)).resolves.toEqual(true);
    await expect(
      db.membership.findFirst({
        where: {
          userId: user.id,
        },
      })
    ).resolves.toHaveProperty("membershipStatus", "PAUSED");
  });
});
