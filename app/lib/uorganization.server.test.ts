import { expect, describe, it } from "vitest";

import db from "db";
import { getRandomMockCtxAndUser } from "test/shared";
import { UOrganization } from "./uorganization";

describe("UOrganization", () => {
  it("#isEnterprise", async () => {
    const { user } = await getRandomMockCtxAndUser();
    const org = await db.organization.findFirstOrThrow({
      where: {
        id: user.memberships[0].organizationId,
      },
    });
    expect(UOrganization.isEnterprise(org)).toBeFalsy();
  });
});
