import { expect, describe, it, vi } from "vitest";

const getProfileAndToken = vi.hoisted(() => {
  return vi.fn(({ code }: { code: string }) => {
    if (code === "bingo") {
      return {
        profile: {
          organization_id: nanoid(),
          id: "xyz",
          email: randomEmail(),
          first_name: "John",
          last_name: "Smith",
        },
      };
    }
    return { profile: {} };
  });
});

vi.mock("integrations/workos", () => {
  return {
    workos: {
      sso: {
        getProfileAndToken,
      },
    },
  };
});

import db from "db";
import { workOsCallbackInner } from "./workos-callback";
import { nanoid } from "nanoid";
import { randomEmail } from "test/shared";

describe("workOsCallback", () => {
  it("no id", async () => {
    await expect(workOsCallbackInner("test")).rejects.toMatchObject({
      code: "SSO_ORGANIZATION_NO_ID",
    });
  });
  it("no organization", async () => {
    await expect(workOsCallbackInner("bingo")).rejects.toMatchObject({
      code: "SSO_ORGANIZATION_MISSING",
    });
  });
  it("organization match", async () => {
    const workOsId = nanoid();
    await db.organization.create({
      data: {
        name: "xxx",
        stripeCustomerId: nanoid(),
        workOsId,
      },
    });

    getProfileAndToken.mockReturnValueOnce({
      profile: {
        organization_id: workOsId,
        id: "xyz",
        email: randomEmail(),
        first_name: "John",
        last_name: "Smith",
      },
    });

    expect(await workOsCallbackInner("bingo")).toMatchObject({
      user: {
        name: "John Smith",
        workOsId: "xyz",
      },
      organization: {
        workOsId: workOsId,
      },
    });
  });
  it("organization and user match", async () => {
    const workOsId = nanoid();

    await db.organization.create({
      data: {
        name: "xxx",
        stripeCustomerId: nanoid(),
        workOsId,
        membership: {
          create: {
            role: "USER",
            user: {
              create: {
                name: "John Smith",
                email: randomEmail(),
              },
            },
          },
        },
      },
    });

    getProfileAndToken.mockReturnValueOnce({
      profile: {
        organization_id: workOsId,
        id: "xyz",
        email: randomEmail(),
        first_name: "John",
        last_name: "Smith",
      },
    });

    await expect(workOsCallbackInner("bingo")).resolves.toMatchObject({
      user: {
        name: "John Smith",
        workOsId: "xyz",
      },
      organization: {
        workOsId,
      },
    });
  });
});
