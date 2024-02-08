import { expect, describe, it, vi } from "vitest";

import signup from "app/auth/mutations/signup";
import { randomEmail, getAnonCtx } from "test/shared";
import db from "db";

vi.mock("integrations/campaignmonitor", () => {
  return {
    campaignMonitorSubscribe: vi.fn(),
  };
});

describe.skip("signup", () => {
  it("signing up once", async () => {
    const USER_EMAIL = randomEmail();
    const anonCtx = getAnonCtx();
    await expect(
      signup(
        {
          name: "Yeah yeah yeah",
          password: "xxxxxxxxxx",
          organizationName: "Foo",
          email: USER_EMAIL,
          subscribe: false,
        },
        anonCtx
      )
    ).resolves.toEqual(undefined);

    await expect(
      db.user.findFirstOrThrow({
        where: {
          email: USER_EMAIL,
        },
      })
    ).resolves.toBeTruthy();

    await expect(
      signup(
        {
          name: "Yeah yeah yeah",
          password: "xxxxxxxxxx",
          organizationName: "Foo",
          email: USER_EMAIL,
          subscribe: false,
        },
        anonCtx
      )
    ).rejects.toThrowError(/Unique/);
  });
});
