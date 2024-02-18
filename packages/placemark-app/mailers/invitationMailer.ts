import { send } from "mailers/utils";
import { env } from "app/lib/env_server";
import { SUPPORT_EMAIL } from "app/lib/constants";

interface InvitationMailer {
  to: string;
  invitationToken: string;
}

export function invitationMailer({ to, invitationToken }: InvitationMailer) {
  const origin = env.DOMAIN;
  const acceptUrl = `${origin}/accept-invitation/${invitationToken}`;

  return send({
    from: SUPPORT_EMAIL,
    to,
    subject: "You have been invited to a team on Placemark",
    html: `
      <h1>Accept the invitation</h1>

      <p>You have been invited to join a team on Placemark.</p>

      <a href="${acceptUrl}">
        Click here to accept the invitation.
      </a>

      <p>Or copy and paste the following URL:</p>

      <p>${acceptUrl}</p>
    `,
  });
}
