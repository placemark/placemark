import { NextApiRequest, NextApiResponse } from "next";
import { withSentry } from "@sentry/nextjs";
import db from "db";

/**
 * For zero-downtime deploys
 */
export default withSentry(async function healthcheck(
  _req: NextApiRequest,
  res: NextApiResponse
) {
  await db.replicacheVersionSingleton.findUnique({
    where: {
      id: 0,
    },
  });

  res.json({
    ok: true,
    sha: process.env.RENDER_GIT_COMMIT,
  });
});
