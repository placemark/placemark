import { send } from "mailers/utils";
import type { Mail } from "mailers/utils";
import { env } from "app/lib/env_server";
import { SUPPORT_EMAIL } from "app/lib/constants";

interface InvitationMailer {
  to: Mail["to"];
}

export function trialEndingMailer({ to }: InvitationMailer) {
  const origin = env.DOMAIN;
  const accountSettings = `${origin}/settings/organization`;

  return send({
    from: SUPPORT_EMAIL,
    to,
    subject: "How to make the most of Placemark",
    html: `
      <p>So you’ve been using Placemark for about a month, and it’s that time:
          the trial is ending. I hope you’re really enjoying it!</p>
      <p>If you need any help at all, just respond to this email, or
    browse our <a href="https://www.placemark.io/documentation-index">documentation</a>.</p>
        <p>
          Need to make a change with your account? You can set up billing information in your
          <a href="${accountSettings}">
            account settings
          </a>.
        </p>
      <p>Have any questions, or feedback? Feel free to just respond to this email.
        I'd love to hear from you. And thanks for giving Placemark a shot.</p>
      <p>-Tom</p>
    `,
  });
}
