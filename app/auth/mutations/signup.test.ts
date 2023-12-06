import { expect, describe, it, vi } from "vitest";

import signup from "app/auth/mutations/signup";
import { randomEmail, getAnonCtx, nanoid } from "test/shared";
import db from "db";

vi.mock("integrations/campaignmonitor", () => {
  return {
    campaignMonitorSubscribe: vi.fn(),
  };
});

vi.mock("integrations/stripe", () => {
  return {
    default: {
      subscriptions: {
        create: vi.fn().mockReturnValue({
          id: "0000",
        }),
      },
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
      createStripeCheckoutSession: vi.fn().mockReturnValue({
        id: "xyz",
      }),
    },
    async updateQuantityForOrganization() {},
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
