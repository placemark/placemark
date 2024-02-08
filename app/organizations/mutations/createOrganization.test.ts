import { beforeEach, expect, describe, it } from "vitest";
import createOrganization from "./createOrganization";
import { getRandomMockCtxAndUser } from "test/shared";

beforeEach(() => {
  (global as any).sessionConfig = {
    getSessions() {
      return [];
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
    ).toEqual(undefined);
  });
});
