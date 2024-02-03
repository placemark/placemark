import { expect, describe, it, test } from "vitest";

import { AuthenticatedCtx } from "blitz";
import { getRandomMockCtxAndUser } from "test/shared";
import { enforceWfcQuota, parseSymbolization } from "./utils_server";
import { env } from "app/lib/env_client";
import { env as env_server } from "app/lib/env_server";
import db from "db";
import createWrappedFeatureCollection from "app/wrappedFeatureCollections/mutations/createWrappedFeatureCollection";
import { SYMBOLIZATION_NONE } from "types";

test("parseSymbolization", () => {
  expect(parseSymbolization({})).toEqual(SYMBOLIZATION_NONE);
});

describe("enforceWfcQuota", () => {
  it("base case - exceeding limit", async () => {
    const { ctx } = await getRandomMockCtxAndUser();
    await expect(enforceWfcQuota(ctx as AuthenticatedCtx)).resolves.toBeFalsy();

    for (let i = 0; i < env_server.WFC_QUOTA - 1; i++) {
      await expect(
        createWrappedFeatureCollection({ name: "Foo" }, ctx)
      ).resolves.toBeTruthy();
    }

    await expect(
      createWrappedFeatureCollection({ name: "Foo" }, ctx)
    ).rejects.toThrowError(/limit/);

    await expect(enforceWfcQuota(ctx as AuthenticatedCtx)).rejects.toThrowError(
      /limit/
    );

    await db.organization.update({
      where: {
        id: ctx.session.orgId,
      },
      data: {
        price: env.NEXT_PUBLIC_STRIPE_PRICE_ID_ENTERPRISE,
      },
    });

    await expect(enforceWfcQuota(ctx as AuthenticatedCtx)).resolves.toBeFalsy();
  });
});
