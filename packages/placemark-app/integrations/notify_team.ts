import { send } from "mailers/utils";
import { env } from "app/lib/env_server";
import { Options } from "nodemailer/lib/mailer";

export function notifyTeam(
  subject: string,
  text: string,
  options: Options = {}
) {
  return send({
    from: "notifications@placemark.io",
    to: env.TEAM_EMAIL,
    subject,
    text,
    ...options,
  }).send();
}
