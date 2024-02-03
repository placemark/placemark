import { beforeAll, expect, describe, it, vi } from "vitest";

import deleteMembership from "app/memberships/mutations/deleteMembership";
import createInvitation from "app/memberships/mutations/createInvitation";
import {
  getAnonCtx,
  randomEmail,
  getRandomMockCtxAndUser,
  nanoid,
} from "test/shared";
import db from "db";
import signupWithInvite from "app/auth/mutations/signupWithInvite";
import changeRole from "./changeRole";

beforeAll(() => {
  (global as any).sessionConfig = {
    getSessions() {
      return [];
    },
  };
});

vi.mock("integrations/stripe", () => {
  return {
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
    stripeEnabled: false,
    updateQuantityForOrganization() {
      return Promise.resolve(true);
    },
  };
});

describe("deleteMembership", () => {
  it("does not let the last admin delete themselves", async () => {
    const { ctx, user } = await getRandomMockCtxAndUser();

    const id = user.memberships[0].id;
    expect(id).toBeTypeOf("number");
    await expect(
      deleteMembership(
        {
          id,
        },
        ctx
      )
    ).rejects.toThrow(/You are the last administrator/);
  });

  it("allows you to delete when you have another admin", async () => {
    const { ctx, user } = await getRandomMockCtxAndUser();
    const anonCtx = getAnonCtx();
    const id = user.memberships[0].id;
    expect(id).toBeTypeOf("number");
    expect(user.memberships[0].role).toEqual("OWNER");

    const emails = randomEmail();

    await expect(
      createInvitation(
        {
          emails,
        },
        ctx
      )
    ).resolves.toBeTruthy();

    const invitationMembership = await db.membership.findFirstOrThrow({
      where: {
        invitationToken: { not: null },
        organizationId: ctx.session.orgId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const { invitationToken } = invitationMembership;

    const email = randomEmail();

    await expect(
      signupWithInvite(
        {
          email,
          password: "yeahfdsafdas",
          invitationToken: invitationToken!,
        },
        anonCtx
      )
    ).resolves.toEqual(true);

    const invitedUser = await db.user.findFirstOrThrow({
      where: {
        email,
      },
      include: { memberships: true },
    });

    await expect(
      changeRole(
        {
          id: invitedUser.memberships[0].id,
          role: "OWNER",
        },
        ctx
      )
    ).resolves.toEqual(true);

    await expect(
      deleteMembership(
        {
          id,
        },
        ctx
      )
    ).resolves.toEqual(true);
  });

  it("does not let you delete an invitation", async () => {
    const { ctx, user } = await getRandomMockCtxAndUser();
    const id = user.memberships[0].organization.id;
    expect(id).toBeTypeOf("number");
    const emails = randomEmail();

    await expect(
      createInvitation(
        {
          emails,
        },
        ctx
      )
    ).resolves.toBeTruthy();

    const [{ id: membershipId }] = await db.membership.findMany({
      where: {
        organizationId: id,
        userId: null,
      },
    });

    await expect(
      deleteMembership(
        {
          id: membershipId,
        },
        ctx
      )
    ).rejects.toThrow(/is an invitation/);
  });
});
