import { expect, describe, it, vi } from "vitest";

import { Ctx } from "blitz";
import forgotPassword from "./forgotPassword";
import db from "db";
import { send } from "mailers/utils";
import { nanoid, randomEmail } from "test/shared";

vi.mock("@blitzjs/auth", async () => {
  const auth = await vi.importActual<Record<string, unknown>>("@blitzjs/auth");
  return {
    ...auth,
    generateToken: () => {
      // console.error("generating token");
      return nanoid();
    },
  };
});

vi.mock("preview-email", () => ({ default: vi.fn() }));

vi.mock("mailers/utils", () => {
  return {
    send: vi.fn().mockReturnValue({
      send: vi.fn(),
    }),
  };
});

describe("forgotPassword mutation", () => {
  it("does not throw error if user doesn't exist", async () => {
    await expect(
      forgotPassword({ email: "no-user@email.com" }, {} as Ctx)
    ).resolves.not.toThrow();
  });

  it("refuses to send a reset for a sso user", async () => {
    const email = randomEmail();
    // Create test user
    const user = await db.user.create({
      data: {
        email,
        workOsId: nanoid(),
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
      },
    });

    // Invoke the mutation
    await forgotPassword({ email: user.email }, {} as Ctx);
    await expect(
      db.token.count({
        where: {
          sentTo: user.email,
        },
      })
    ).resolves.toEqual(0);
  });

  it("sends an email if the user does exist", async () => {
    const email = randomEmail();
    const beforeCount = await db.token.count({
      where: {
        sentTo: email,
      },
    });
    expect(beforeCount).toEqual(0);
    // expect(await db.token.count()).toEqual(1);
    // Create test user
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
          create: {
            type: "RESET_PASSWORD",
            hashedToken: nanoid(),
            expiresAt: new Date(),
            sentTo: email,
          },
        },
      },
      include: { tokens: true },
    });

    // Invoke the mutation
    await forgotPassword({ email: user.email }, {} as Ctx);

    const tokens = await db.token.findMany({ where: { userId: user.id } });
    const token = tokens[0];

    // delete's existing tokens
    expect(tokens).toHaveLength(1);

    expect(token.id).not.toBe(user.tokens[0].id);
    expect(token.type).toBe("RESET_PASSWORD");
    expect(token.sentTo).toBe(user.email);
    expect(token.expiresAt > new Date()).toBe(true);
    expect(send).toBeCalled();
  });
});
