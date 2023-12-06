import { expect, describe, it } from "vitest";

import changeEmail from "./changeEmail";
import { randomEmail, getRandomMockCtxAndUser } from "test/shared";
import db from "db";

describe("changeEmail mutation", () => {
  it("rejects given a bad email", async () => {
    const { ctx } = await getRandomMockCtxAndUser();
    await expect(
      changeEmail(
        {
          currentEmail: "nope@nope.com",
          newEmail: "foo@bar.com",
        },
        ctx
      )
    ).rejects.toThrow(/incorrect/);
  });
  it("works correctly", async () => {
    const { ctx, user, email } = await getRandomMockCtxAndUser();
    const newEmail = randomEmail();
    expect(
      await changeEmail(
        {
          currentEmail: email,
          newEmail,
        },
        ctx
      )
    ).toEqual(true);
    const userAfter = await db.user.findFirst({
      where: { id: user.id },
    });
    expect(userAfter?.email).toBe(newEmail);
  });
});
