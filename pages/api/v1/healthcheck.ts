import { NextApiRequest, NextApiResponse } from "next";
import db from "db";

/**
 * As the healthcheck for the api.placemark.io
 * subdomain
 */
export default async function healthcheck(
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
}
