import { resolver } from "@blitzjs/rpc";
import { z } from "zod";
import { client } from "integrations/octokit_issues";
import db from "db";
import { notifyTeam } from "integrations/notify_team";
import { shortUnsafeId } from "app/lib/id";
import { SessionContext } from "@blitzjs/auth";

const SubmitFeedback = z.object({
  body: z.string(),
  userAgent: z.string(),
  location: z.string(),
});

export default resolver.pipe(
  resolver.zod(SubmitFeedback),
  async ({ body: bodyInput, userAgent, location }, ctx) => {
    const uuid = shortUnsafeId();

    try {
      const session: SessionContext = ctx.session;
      session.$authorize();
      const { userId, orgId } = ctx.session;

      const user = await db.user.findFirstOrThrow({
        select: {
          name: true,
          id: true,
          email: true,
        },
        where: {
          id: userId!,
        },
      });

      const org = await db.organization.findFirst({
        select: {
          name: true,
        },
        where: {
          id: orgId,
        },
      });
      const body = `${bodyInput}

---

### From

- User Agent: \`${userAgent}\`
- User ID: ${user.id || "?"}
- Name: ${user.name || "?"}
- Email: ${user.email}
- Organization: ${org?.name || ""}
- Location: \`${location}\`
- UUID: ${uuid}
`;

      const issue = await client.request("POST /repos/{owner}/{repo}/issues", {
        owner: "placemark",
        repo: "placemark",
        title: `Feedback from ${user.email}`,
        body,
        assignees: [],
        labels: ["feedback"],
      });

      await notifyTeam(
        `New feedback from ${user.email} (${user.name || "?"})`,
        `Issue: ${issue?.data?.html_url || "?"}
${body}`,
        {
          replyTo: user.email,
        }
      );

      return true;
    } catch (e) {
      const body = `${bodyInput}

---

### From

- User Agent: \`${userAgent}\`
- Anonymous
- Location: \`${location}\`
`;

      const issue = await client.request("POST /repos/{owner}/{repo}/issues", {
        owner: "placemark",
        repo: "placemark",
        title: `Feedback from Anonymous`,
        body,
        assignees: [],
        labels: ["feedback"],
      });

      await notifyTeam(
        `New feedback from Anonymous`,
        `Issue: ${issue?.data?.html_url || "?"}
${body}`,
        {
          replyTo: "tom@macwright.com",
        }
      );

      return true;
    }
  }
);
