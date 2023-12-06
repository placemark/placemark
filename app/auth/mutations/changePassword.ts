import { resolver } from "@blitzjs/rpc";
import { SecurePassword } from "@blitzjs/auth/secure-password";
import db from "db";
import signin, { authenticateUser } from "./signin";
import { ChangePassword } from "../validations";
import { NotFoundError } from "blitz";

export default resolver.pipe(
  resolver.zod(ChangePassword),
  resolver.authorize(),
  async ({ currentPassword, newPassword }, ctx) => {
    const user = await db.user.findFirst({
      where: { id: ctx.session.userId },
    });
    if (!user) throw new NotFoundError();

    await authenticateUser(user.email, currentPassword);

    const hashedPassword = await SecurePassword.hash(newPassword.trim());
    await db.user.update({
      where: { id: user.id },
      data: { hashedPassword },
    });

    await db.session.deleteMany({ where: { userId: user.id } });

    await signin({ email: user.email, password: newPassword }, ctx);

    return true;
  }
);
