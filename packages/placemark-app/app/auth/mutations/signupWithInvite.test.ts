import { expect, describe, it } from "vitest";

import createInvitation from "app/memberships/mutations/createInvitation";
import signupWithInvite from "app/auth/mutations/signupWithInvite";
import { getRandomMockCtxAndUser, getAnonCtx, randomEmail } from "test/shared";
import db from "db";
import { AuthorizationError } from "blitz";

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
