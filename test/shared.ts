import db from "db";
import { Ctx } from "blitz";
import noop from "lodash/noop";
import { vi } from "vitest";
import { customAlphabet } from "nanoid";

export const nanoid = customAlphabet(
  "useandom26T198340PX75pxJACKVERYMINDBUSHWOLFGQZbfghjklqvwyzrict",
  21
);

export const USER_EMAIL = "user@example.com";

export function randomEmail() {
  return `user-${nanoid()}@foo.com`.toLowerCase();
}

export async function getRandomMockCtxAndUser() {
  const email = randomEmail();
  const res = await getMockCtxAndUser(email);

  return {
    ...res,
    email,
  };
}

export async function getMockCtxAndUser(email = USER_EMAIL) {
  const user = await db.user.create({
    data: {
      email: email,
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
    include: {
      memberships: {
        select: {
          id: true,
          role: true,
          organizationId: true,
          organization: {
            select: {
              id: true,
            },
          },
        },
      },
    },
  });
  const ctx = {
    session: {
      $authorize: noop,
      $isAuthorized: () => true,
      $setPublicData: vi.fn().mockReturnValue(Promise.resolve(true)),
      $revoke: vi.fn(),
      $create: vi.fn(),
      userId: user.id,
      roles: ["USER", "OWNER"],
      orgId: user.memberships[0].organization.id,
    },
  } as unknown as Ctx;

  return { user, ctx };
}

export function getAnonCtx() {
  const ctx = {
    session: {
      $authorize: noop,
      $isAuthorized: () => false,
      $create: noop,
      userId: null,
      roles: null,
      orgId: null,
    },
  } as unknown as Ctx;
  return ctx;
}
