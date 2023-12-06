import { resolver } from "@blitzjs/rpc";
import db from "db";
import { capture } from "integrations/posthog";
import { ChangeEmail } from "../validations";

export class WrongEmailError extends Error {
  name = "WrongEmailError";
  message = "Current email address is incorrect.";
}

export default resolver.pipe(
  resolver.zod(ChangeEmail),
  resolver.authorize(),
  async ({ currentEmail, newEmail }, ctx) => {
    const { count } = await db.user.updateMany({
      where: { id: ctx.session.userId, email: currentEmail },
      data: { email: newEmail },
    });

    if (count !== 1) {
      throw new WrongEmailError();
    }

    capture(ctx, {
      event: "change-email",
    });

    return true;
  }
);
