import { resolver } from "@blitzjs/rpc";
import { Octokit } from "@octokit/core";
import db from "db";

/**
 * Check whether a user has GitHub connected _and_
 * their token still works.
 */
const getGitHubStatus = resolver.pipe(
  resolver.authorize(),
  async (_input, ctx) => {
    const user = await db.user.findFirstOrThrow({
      where: { id: ctx.session.userId },
      select: {
        githubToken: true,
      },
    });

    if (!user.githubToken) {
      return null;
    }

    const octokit = new Octokit({
      auth: user.githubToken,
    });

    try {
      const githubUser = await octokit.request("GET /user");
      return githubUser.data;
    } catch (e) {
      return null;
    }
  }
);

export default getGitHubStatus;
