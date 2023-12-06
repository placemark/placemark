import { resolver } from "@blitzjs/rpc";
import db from "db";
import { app } from "integrations/octokit";
import { capture } from "integrations/posthog";
import * as Sentry from "@sentry/nextjs";

export default resolver.pipe(
  resolver.authorize(),
  async function updateUserOptions(_input, ctx) {
    const user = await db.user.findFirstOrThrow({
      where: { id: ctx.session.userId },
    });

    if (!user.githubToken) {
      return;
    }

    await db.user.update({
      where: { id: ctx.session.userId },
      data: {
        githubToken: null,
      },
    });

    try {
      await app.deleteToken({
        token: user.githubToken,
      });
    } catch (e) {
      Sentry.captureException(e);
    }

    capture(ctx, {
      event: "user-delete-github-token",
    });

    return null;
  }
);
