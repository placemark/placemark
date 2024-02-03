import { beforeEach, expect, describe, it, vi } from "vitest";

import createOrganization from "./createOrganization";
import { getRandomMockCtxAndUser } from "test/shared";
import { nanoid } from "app/lib/id";

beforeEach(() => {
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
        create: vi.fn(() => ({ id: `customer-id-${nanoid()}` })),
        retrieve: vi.fn(() => ({ id: `customer-id-${nanoid()}` })),
      },
    },
    env: {
      STRIPE_PRICE_ID: "0000",
    },
    stripeEnabled: false,
    createStripeCheckoutSession() {
      return Promise.resolve({ id: "0021" });
    },
  };
});

describe("createOrganization", () => {
  it("base", async () => {
    const { ctx } = await getRandomMockCtxAndUser();
    expect(
      await createOrganization(
        {
          name: "Big guns",
        },
        ctx
      )
    ).toEqual("");
  });
});
