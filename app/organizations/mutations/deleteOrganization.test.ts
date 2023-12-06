import { beforeAll, expect, describe, it, vi } from "vitest";

import deleteOrganization from "./deleteOrganization";
import createOrganization from "./createOrganization";
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
        del: vi.fn(),
      },
      env: {
        STRIPE_PRICE_ID: "0000",
      },
    },
    createStripeCheckoutSession() {
      return Promise.resolve({ id: "0001" });
    },
  };
});

describe("deleteOrganization", () => {
  it("prevents you from deleting your only team", async () => {
    const { ctx, user } = await getRandomMockCtxAndUser();
    const id = user.memberships[0].organization.id;
    expect(await db.organization.count({ where: { id } })).toEqual(1);
    await expect(deleteOrganization({}, ctx)).rejects.toThrow(/last team/);
    expect(await db.organization.count({ where: { id } })).toEqual(1);
  });

  it("force deletion of your final organization", async () => {
    const { ctx, user } = await getRandomMockCtxAndUser();
    const id = user.memberships[0].organization.id;
    expect(await db.organization.count({ where: { id } })).toEqual(1);
    await expect(
      deleteOrganization({ force: true }, ctx)
    ).resolves.toBeTruthy();
    expect(ctx.session.$revoke).toBeCalled();
    expect(await db.organization.count({ where: { id } })).toEqual(0);
  });

  it("allows you to delete your first team after creating another one", async () => {
    const { ctx, user } = await getRandomMockCtxAndUser();
    expect(
      await createOrganization(
        {
          name: "Big guns",
        },
        ctx
      )
    ).toEqual("0001");
    expect(await db.membership.count({ where: { userId: user.id } })).toEqual(
      2
    );
    await expect(deleteOrganization({}, ctx)).resolves.toBeTruthy();
    expect(await db.membership.count({ where: { userId: user.id } })).toEqual(
      1
    );
  });
});
