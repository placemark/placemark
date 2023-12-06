import { expect, describe, it, vi } from "vitest";

import createInvitation, { parseAddresses } from "./createInvitation";
import { getRandomMockCtxAndUser } from "test/shared";
import { send } from "mailers/utils";

vi.mock("mailers/utils", () => {
  return {
    send: vi.fn().mockReturnValue({
      send: vi.fn(),
    }),
  };
});

describe("flattenAddresses", () => {
  it("simple", () => {
    expect(parseAddresses("foo@macwright.com")).toEqual([
      {
        address: "foo@macwright.com",
        name: null,
      },
    ]);
  });
  it("multi", () => {
    expect(parseAddresses("foo@macwright.com, bar@macwright.com")).toEqual([
      {
        address: "foo@macwright.com",
        name: null,
      },
      {
        address: "bar@macwright.com",
        name: null,
      },
    ]);
  });
  it("with name", () => {
    expect(parseAddresses(`"Jonny" <jonny@j.com>`)).toEqual([
      {
        address: "jonny@j.com",
        name: "Jonny",
      },
    ]);
  });
  it("invalid", () => {
    expect(() => parseAddresses("")).toThrow();
    expect(() => parseAddresses("hi")).toThrow();
  });
  it("group", () => {
    expect(parseAddresses("people:foo@bar.com,bar@baz.com;")).toEqual([
      {
        address: "foo@bar.com",
        name: null,
      },
      {
        address: "bar@baz.com",
        name: null,
      },
    ]);
  });
});

describe("createInvitation mutation", () => {
  it("works correctly", async () => {
    const { ctx } = await getRandomMockCtxAndUser();
    await expect(
      createInvitation(
        {
          emails: "john@foo.com",
        },
        ctx
      )
    ).resolves.toEqual({
      failed: [],
      invited: 1,
      success: true,
    });
    expect(send).toBeCalled();
  });
  it("works correctly", async () => {
    const { ctx } = await getRandomMockCtxAndUser();
    await expect(
      createInvitation(
        {
          emails: "john@foo.com,bo@foo.com",
        },
        ctx
      )
    ).resolves.toEqual({
      failed: [],
      invited: 2,
      success: true,
    });
    expect(send).toBeCalled();
  });
  it("works correctly", async () => {
    const { ctx } = await getRandomMockCtxAndUser();
    await expect(
      createInvitation(
        {
          emails: "",
        },
        ctx
      )
    ).rejects.toThrow();
  });
});
