import { api } from "app/blitz-server";
import { app } from "integrations/octokit";
import db from "db";
import { z } from "zod";
import { Ctx } from "blitz";
import { errorUrl } from "app/lib/constants";
import { capture } from "integrations/posthog";

/**
 * Query params can be string or string[] - make
 * sure that code is specified once.
 */
const Params = z
  .object({
    code: z.string(),
  })
  .passthrough();

export default api(async function (req, res, _ctx) {
  const q = Params.safeParse(req.query);

  if (!q.success) {
    return res.redirect(errorUrl("GITHUB_TOKEN_MISSING"));
  }

  const ctx: Ctx = _ctx;
  ctx.session.$authorize();

  const {
    authentication: { token },
  } = await app.createToken({
    code: q.data.code,
  });

  await db.user.update({
    where: {
      id: ctx.session.userId,
    },
    data: {
      githubToken: token,
    },
  });

  capture(ctx, {
    event: "user-connect-with-github",
  });

  res.redirect("/close-window");

  return;
});
