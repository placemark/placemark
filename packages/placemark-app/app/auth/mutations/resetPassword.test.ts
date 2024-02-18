import { expect, describe, it, vi } from "vitest";

import { hash256 } from "@blitzjs/auth";
import { SecurePassword } from "@blitzjs/auth/secure-password";
import resetPassword from "./resetPassword";
import db from "db";
import { Ctx } from "blitz";
import { randomEmail } from "test/shared";

const mockCtx = {
  session: {
    $create: vi.fn(),
  },
} as unknown as Ctx;

describe("resetPassword mutation", () => {
  it("works correctly", async () => {
    expect(true).toBe(true);

    // Create test user
    const goodToken = "randomPasswordResetToken";
    const expiredToken = "expiredRandomPasswordResetToken";
    const future = new Date();
    future.setHours(future.getHours() + 4);
    const past = new Date();
    past.setHours(past.getHours() - 4);

    const email = randomEmail();

    const user = await db.user.create({
      data: {
        email,
        memberships: {
          create: {
            role: "OWNER",
            organization: {
              create: {
                name: "My Team",
              },
            },
          },
        },
        tokens: {
          // Create old token to ensure it's deleted
          create: [
            {
              type: "RESET_PASSWORD",
              hashedToken: hash256(expiredToken),
              expiresAt: past,
              sentTo: email,
            },
            {
              type: "RESET_PASSWORD",
              hashedToken: hash256(goodToken),
              expiresAt: future,
              sentTo: email,
            },
          ],
        },
      },
      include: { tokens: true },
    });

    const newPassword = "newPassword";

    // Non-existent token
    await expect(
      resetPassword(
        { token: "no-token", password: "", passwordConfirmation: "" },
        mockCtx
      )
    ).rejects.toThrowError();

    // Expired token
    await expect(
      resetPassword(
        {
          token: expiredToken,
          password: newPassword,
          passwordConfirmation: newPassword,
        },
        mockCtx
      )
    ).rejects.toThrowError();

    // Good token
    await expect(
      resetPassword(
        {
          token: goodToken,
          password: newPassword,
          passwordConfirmation: newPassword,
        },
        mockCtx
      )
    ).resolves.toBeTruthy();

    // Deletes the token
    const numberOfTokens = await db.token.count({ where: { userId: user.id } });
    expect(numberOfTokens).toBe(0);

    // Updates user's password
    const updatedUser = await db.user.findFirst({ where: { id: user.id } });
    expect(
      await SecurePassword.verify(updatedUser!.hashedPassword, newPassword)
    ).toBe(SecurePassword.VALID);

    // Good token
    await expect(
      resetPassword(
        {
          token: goodToken,
          password: newPassword,
          passwordConfirmation: newPassword,
        },
        mockCtx
      )
    ).rejects.toBeTruthy();
  });
});
