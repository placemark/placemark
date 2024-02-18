import { SessionContext } from "@blitzjs/auth";
import { resolver } from "@blitzjs/rpc";
import db from "db";

const getWalkthroughState = resolver.pipe(async (_input, ctx) => {
  try {
    const session: SessionContext = ctx.session;
    session.$authorize();

    const user = await db.user.findFirstOrThrow({
      where: { id: ctx.session.userId! },
      select: {
        walkthroughState: true,
      },
    });

    return user.walkthroughState;
  } catch (e) {
    return "V1_05_DONE";
  }
});

export default getWalkthroughState;
