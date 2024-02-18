import { resolver } from "@blitzjs/rpc";
import { z } from "zod";
import { client } from "integrations/octokit_issues";
import { notifyTeam } from "integrations/notify_team";

const SubmitFeedback = z.object({
  body: z.string(),
  email: z.string().optional(),
  userAgent: z.string(),
  location: z.string(),
});

export default resolver.pipe(
  resolver.zod(SubmitFeedback),
  async ({ body: bodyInput, email, userAgent }) => {
    const body = `${bodyInput}

---

### From

- User Agent: \`${userAgent}\`
- Email: ${email || ""}
`;

    const issue = await client.request("POST /repos/{owner}/{repo}/issues", {
      owner: "placemark",
      repo: "placemark",
      title: `Feedback from ${email || "?"} (cancellation)`,
      body,
      assignees: [],
      labels: ["feedback-cancellation"],
    });

    await notifyTeam(
      `New feedback from ${email || ""}`,
      `Issue: ${issue?.data?.html_url || "?"}
${body}`
    );

    return true;
  }
);
