import previewEmail from "preview-email";
import postmark from "integrations/postmark";

export type Mail = Parameters<typeof postmark.sendMail>[0];

export function send(msg: Mail) {
  return {
    async send() {
      if (process.env.NODE_ENV === "test") {
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
