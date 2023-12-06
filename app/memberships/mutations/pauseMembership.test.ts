import { beforeAll, expect, describe, it, vi } from "vitest";

import pauseMemberships from "app/memberships/mutations/pauseMemberships";
import { getRandomMockCtxAndUser, nanoid } from "test/shared";
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
    updateQuantityForOrganization() {
      return Promise.resolve(true);
    },
  };
});

describe("pauseMemberships", () => {
  it("pauses a membership", async () => {
    const { ctx, user } = await getRandomMockCtxAndUser();
    await expect(
      db.membership.findFirst({
        where: {
          userId: user.id,
        },
      })
    ).resolves.toHaveProperty("membershipStatus", "ACTIVE");
    await expect(pauseMemberships({}, ctx)).resolves.toEqual(true);
    await expect(
      db.membership.findFirst({
        where: {
          userId: user.id,
        },
      })
    ).resolves.toHaveProperty("membershipStatus", "PAUSED");
  });
});
