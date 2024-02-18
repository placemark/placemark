import { send } from "mailers/utils";
import { env } from "app/lib/env_server";
import { SUPPORT_EMAIL } from "app/lib/constants";

interface ResetPasswordMailer {
  to: string;
  token: string;
}

export function forgotPasswordMailer({ to, token }: ResetPasswordMailer) {
  const origin = env.DOMAIN;
  const resetUrl = `${origin}/reset-password?token=${token}`;

  return send({
    from: SUPPORT_EMAIL,
    to,
    subject: "Your password reset instructions",
    html: `
      <h1>Reset your password</h1>

      <p>You requested to reset your password with Placemark.</p>

      <a href="${resetUrl}">
        Click here to set a new password.
      </a>
    `,
  });
}
