import previewEmail from "preview-email";
import postmark from "integrations/postmark";
import { env } from "app/lib/env_server";

export type Mail = Parameters<typeof postmark.sendMail>[0];

export function send(msg: Mail) {
  return {
    async send() {
      if (env.POSTMARK_SERVER_API_TOKEN === "off") {
        // eslint-disable-next-line
        console.error("Skipping mail send because Postmark is not configured");
      } else if (process.env.NODE_ENV === "test") {
        // Pass
      } else if (
        process.env.ENABLE_EMAIL ||
        process.env.NODE_ENV === "production"
      ) {
        await postmark.sendMail(msg);
      } else {
        await previewEmail(msg);
      }
    },
  };
}
