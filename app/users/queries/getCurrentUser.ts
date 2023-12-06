import { resolver } from "@blitzjs/rpc";
import { AuthenticatedMiddlewareCtx } from "blitz";
import db from "db";

export async function getCurrentUserInternal(ctx: AuthenticatedMiddlewareCtx) {
  const user = await db.user.findFirstOrThrow({
    where: { id: ctx.session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      darkMode: true,
      coordinateOrder: true,
      areaUnits: true,
      workOsId: true,
      lengthUnits: true,
      onboardDocumentationHighlights: true,
      memberships: {
        select: {
          id: true,
          role: true,
          organization: true,
        },
      },
    },
  });

  const organization = await db.organization.findFirstOrThrow({
    where: {
      id: ctx.session.orgId,
    },
  });

  return {
    ...user,
    organization,
  };
}

const getCurrentUser = resolver.pipe(
  resolver.authorize(),
  async (_input, ctx) => {
    return getCurrentUserInternal(ctx);
  }
);

export default getCurrentUser;

export type CurrentUser = NonNullable<
  Awaited<ReturnType<typeof getCurrentUser>>
>;
