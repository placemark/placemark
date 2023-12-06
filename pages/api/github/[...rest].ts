import { middleware } from "integrations/octokit";
import { NextApiRequest, NextApiResponse } from "next";

export default async function githubEndpoints(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await middleware(req, res, () => {
    res.status(404).end("Not found");
  });
}

export const config = {
  api: {
    externalResolver: true,
    bodyParser: false,
  },
};
