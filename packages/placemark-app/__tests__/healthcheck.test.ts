import { expect, describe, it, vi } from "vitest";

import healthcheck from "pages/api/healthcheck";
import type { NextApiRequest, NextApiResponse } from "next";

describe("healthcheck", () => {
  it("get", async () => {
    const req = {} as NextApiRequest;
    const res = {
      json: vi.fn(),
    } as unknown as NextApiResponse;
    await healthcheck(req, res);
    expect(res.json).toBeCalledWith({ ok: true });
  });
});
