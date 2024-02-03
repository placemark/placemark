import { beforeAll, expect, describe, it, vi } from "vitest";

import acceptInvitation from "app/memberships/mutations/acceptInvitation";
import createInvitation from "app/memberships/mutations/createInvitation";
import {
  getMockCtxAndUser,
  getRandomMockCtxAndUser,
  nanoid,
  randomEmail,
} from "test/shared";
import db from "db";

beforeAll(() => {
  (global as any).sessionConfig = {
    getSessions() {
      return [];
    },
  };
});

vi.mock("integrations/stripe", () => {
  return {
    stripeEnabled: false,
    default: {
      customers: {
        create: vi.fn(() => ({
          id: `customer-${nanoid()}`,
        })),
        retrieve: vi.fn(() => ({
          id: `customer-${nanoid()}`,
        })),
      },
      checkout: {
        sessions: {
          create: vi.fn().mockReturnValue({
            id: "0000",
          }),
        },
      },
      env: {
        STRIPE_PRICE_ID: "0000",
      },
    },
    async updateQuantityForOrganization() {},
  };
});

describe("acceptInvite", () => {
  it("not found", async () => {
    const { ctx } = await getRandomMockCtxAndUser();
    await expect(
      acceptInvitation(
        {
          invitationToken: "foobar",
        },
        ctx
      )
    ).rejects.toThrow();
    expect(ctx.session.$setPublicData).not.toBeCalled();
  });

  it("works if you invite the person first", async () => {
    const { ctx, user } = await getRandomMockCtxAndUser();
    const email2 = randomEmail();
    const stripeId = nanoid();
    const { ctx: ctx2 } = await getMockCtxAndUser(email2, stripeId);
    const id = user.memberships[0].organization.id;
    const emails = randomEmail();
    await expect(
      createInvitation(
        {
          emails,
        },
        ctx
      )
    ).resolves.toBeTruthy();

    const { invitationToken } = await db.membership.findFirstOrThrow({
      where: {
        invitationToken: { not: null },
        organizationId: id,
      },
    });

    await expect(
      db.membership.count({
        where: {
          organizationId: id,
          userId: { not: null },
        },
      })
    ).resolves.toEqual(1);

    await expect(
      acceptInvitation(
        {
          invitationToken: invitationToken!,
        },
        ctx
      )
    ).rejects.toThrow(/already be a member/);

    await expect(
      acceptInvitation(
        {
          invitationToken: invitationToken!,
        },
        ctx2
      )
    ).resolves.toBeTruthy();

    expect(ctx2.session.$setPublicData).toBeCalled();

    await expect(
      db.membership.count({
        where: {
          organizationId: id,
          userId: { not: null },
        },
      })
    ).resolves.toEqual(2);

    await expect(
      acceptInvitation(
        {
          invitationToken: invitationToken!,
        },
        ctx2
      )
    ).rejects.toThrow(/already been accepted/);
  });
});
