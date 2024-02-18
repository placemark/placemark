import { send } from "mailers/utils";
import type { Mail } from "mailers/utils";
import { SUPPORT_EMAIL } from "app/lib/constants";

interface DeletedAccountMailer {
  to: Mail["to"];
}

export function deletedAccountMailer({ to }: DeletedAccountMailer) {
  return send({
    from: SUPPORT_EMAIL,
    to,
    subject: "Your Placemark account has been deleted",
    html: `
      <p>Your Placemark account has been deleted. Sorry to see you go!</p>
      <p>If you have any feedback at all, I'd really love to hear it - just respond to this email.</p>
      <br />
      <p>-Tom</p>
    `,
  });
}
