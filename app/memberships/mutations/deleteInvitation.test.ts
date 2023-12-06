import { expect, describe, it } from "vitest";

import deleteInvitation from "app/memberships/mutations/deleteInvitation";
import createInvitation from "app/memberships/mutations/createInvitation";
import { getRandomMockCtxAndUser } from "test/shared";
import db from "db";

describe("deleteInvitation", () => {
  it("not found", async () => {
    const { ctx } = await getRandomMockCtxAndUser();
    await expect(
      deleteInvitation(
        {
          id: 10,
        },
        ctx
      )
    ).rejects.toThrow();
  });
  it("deleting a freshly-created invitation", async () => {
    const { ctx, user } = await getRandomMockCtxAndUser();
    await expect(
      createInvitation(
        {
          emails: "john@foo.com",
        },
        ctx
      )
    ).resolves.toBeTruthy();

    const [{ id }] = await db.membership.findMany({
      where: {
        organizationId: user.memberships[0].organizationId,
        user: null,
      },
    });

    await expect(
      deleteInvitation(
        {
          id,
        },
        ctx
      )
    ).resolves.toEqual(true);

    await expect(
      db.membership.findMany({
        where: {
          organizationId: user.memberships[0].organizationId,
          user: null,
        },
      })
    ).resolves.toHaveLength(0);
  });
});
