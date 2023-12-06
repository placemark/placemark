import { expect, describe, it, vi } from "vitest";

import changeName from "./changeOrganizationName";
import { getRandomMockCtxAndUser } from "test/shared";
import db from "db";

vi.mock("integrations/stripe", () => {
  return {
    default: {
      customers: {
        update: vi.fn().mockReturnValue(Promise.resolve(true)),
      },
    },
  };
});

describe("changeName mutation", () => {
  it("works correctly", async () => {
    const { ctx, user } = await getRandomMockCtxAndUser();
    const id = user.memberships[0].organization.id;
    expect(
      await changeName(
        {
          name: "Yeah yeah yeah",
          id,
        },
        ctx
      )
    ).toEqual(true);
    const organizationAfter = await db.organization.findFirst({
      where: { id },
    });
    expect(organizationAfter?.name).toBe("Yeah yeah yeah");
  });
});
