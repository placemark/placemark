import { beforeAll, expect, describe, it } from "vitest";

import switchOrganization from "app/auth/mutations/switchOrganization";
import { getRandomMockCtxAndUser } from "test/shared";

beforeAll(() => {
  (global as any).sessionConfig = {
    getSessions() {
      return [];
    },
  };
});

describe("switchOrganization mutation", () => {
  it("does not let you switch to an organization you don’t belong to", async () => {
    const { ctx } = await getRandomMockCtxAndUser();
    await expect(
      switchOrganization(
        {
          id: 2,
        },
        ctx
      )
    ).rejects.toThrow();
    expect(ctx.session.$setPublicData).not.toBeCalled();
  });
  it("lets you switch to the same organization", async () => {
    const { ctx, user } = await getRandomMockCtxAndUser();
    await expect(
      switchOrganization(
        {
          id: user.memberships[0].organizationId,
        },
        ctx
      )
    ).resolves.toEqual(true);
    expect((ctx.session.$setPublicData as any).mock.lastCall).toHaveProperty(
      ["0", "roles"],
      ["CUSTOMER", "OWNER"]
    );
  });
});
