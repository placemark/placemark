import { expect, describe, it, vi } from "vitest";

import createInvitation from "app/memberships/mutations/createInvitation";
import signupWithInvite from "app/auth/mutations/signupWithInvite";
import {
  getRandomMockCtxAndUser,
  getAnonCtx,
  nanoid,
  randomEmail,
} from "test/shared";
import db from "db";
import { AuthorizationError } from "blitz";

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
    async updateQuantityForOrganization() {},
  };
});

describe("signupWithInvite", () => {
  it("works if you invite the person first", async () => {
    const { ctx, user } = await getRandomMockCtxAndUser();
    const anonCtx = getAnonCtx();
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
      signupWithInvite(
        {
          email: "boo@foo.com",
          password: "yeahfdsafdas",
          invitationToken: invitationToken!,
        },
        ctx
      )
    ).rejects.toThrow(/already logged in/);

    await expect(
      signupWithInvite(
        {
          email: user.email,
          password: "yeahfdsafdas",
          invitationToken: invitationToken!,
        },
        anonCtx
      )
    ).rejects.toThrow(/already be a member/);

    const emailThatSignsUp = randomEmail();

    await expect(
      signupWithInvite(
        {
          email: emailThatSignsUp,
          password: "yeahfdsafdas",
          invitationToken: invitationToken!,
        },
        anonCtx
      )
    ).resolves.toEqual(true);

    await expect(
      db.membership.count({
        where: {
          organizationId: id,
          userId: { not: null },
        },
      })
    ).resolves.toEqual(2);

    await expect(
      signupWithInvite(
        {
          email: emailThatSignsUp,
          password: "yeahfdsafdas",
          invitationToken: invitationToken!,
        },
        ctx
      )
    ).rejects.toThrow(AuthorizationError);
  });
});
