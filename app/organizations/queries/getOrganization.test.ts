import { expect, describe, it, vi } from "vitest";

import getOrganization from "./getOrganization";
import { getRandomMockCtxAndUser } from "test/shared";

vi.mock("integrations/stripe", () => {
  return {
    default: {
      customers: {
        create: vi.fn().mockReturnValue({
          id: "0000",
        }),
        retrieve: vi.fn().mockReturnValue({
          id: "0000",
        }),
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
    updateQuantityForOrganization(_id: any) {
      return Promise.resolve(true);
    },
    stripeEnabled: false,
  };
});

describe("getWrappedFeatureCollection", () => {
  it("returns a created feature collection", async () => {
    const { ctx } = await getRandomMockCtxAndUser();
    await expect(getOrganization({}, ctx)).resolves.toMatchObject({
      organization: {
        name: "My Team",
      },
    });
  });
});
