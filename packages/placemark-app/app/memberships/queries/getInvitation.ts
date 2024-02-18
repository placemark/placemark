import { resolver } from "@blitzjs/rpc";
import db from "db";
import { GetInvitation } from "app/memberships/validations";

const getInvitation = resolver.pipe(
  resolver.zod(GetInvitation),
  async ({ token }) => {
    return await db.membership.findFirst({
      where: { invitationToken: token },
      include: { organization: true },
    });
  }
);

export default getInvitation;

export type Invitation = Awaited<ReturnType<typeof getInvitation>>;
