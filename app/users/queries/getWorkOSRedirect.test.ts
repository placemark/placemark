import { expect, vi, test } from "vitest";

vi.mock("integrations/workos", () => {
  return {
    workos: {
      organizations: {
        listOrganizations: vi.fn().mockReturnValue({
          data: [],
        }),
      },
    },
  };
});

import { getWorkOSRedirectInner } from "./getWorkOSRedirect";

test("getWorkOSRedirect", async () => {
  await expect(getWorkOSRedirectInner("tom@macwright.com")).resolves.toEqual(
    null
  );
});
