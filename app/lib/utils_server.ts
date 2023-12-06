import { AuthenticatedMiddlewareCtx } from "blitz";
import LAYERS from "app/lib/default_layers";
import db, { MembershipStatus, Prisma } from "db";
import { generateKeyBetween } from "fractional-indexing";
import { updateQuantityForOrganization } from "integrations/stripe";
import { JsonValue } from "type-fest";
import {
  ISymbolization,
  Symbolization,
  tryUpgrading,
  SYMBOLIZATION_NONE,
} from "types";
import { env } from "./env_server";
import { QuotaError } from "./errors";
import { UOrganization } from "./uorganization";
import { formatCount, safeParseMaybe } from "./utils";

export function getWrappedFeatureCollection(
  id: string,
  ctx: AuthenticatedMiddlewareCtx
) {
  return db.wrappedFeatureCollection.findFirstOrThrow({
    where: {
      id,
      organization: {
        id: ctx.session.orgId!,
      },
    },
  });
}

export async function enforceWfcQuota(ctx: AuthenticatedMiddlewareCtx) {
  const organization = await db.organization.findFirstOrThrow({
    where: {
      id: ctx.session.orgId!,
    },
  });

  /**
   * Allow Enterprise organizations unlimited maps.
   */
  const quota = UOrganization.isEnterprise(organization)
    ? env.WFC_QUOTA_ENTERPRISE
    : env.WFC_QUOTA;

  /**
   * Confirm quota
   */
  const wfcCount = await db.wrappedFeatureCollection.count({
    where: {
      organization: {
        id: ctx.session.orgId!,
      },
    },
  });

  if (wfcCount >= quota) {
    throw new QuotaError(
      `You’ve exceeded the limit of ${formatCount(
        env.WFC_QUOTA
      )} maps. Please contact support if you need additional storage.`
    );
  }
}

export function parseSymbolization(symbolization: JsonValue): ISymbolization {
  return safeParseMaybe(Symbolization.safeParse(symbolization))
    .altLazy(() => tryUpgrading(symbolization))
    .orDefault(SYMBOLIZATION_NONE);
}

/**
 * Get the next value from the version singleton.
 * This is in Prisma-land, so it's generally used by mutations.
 */
export async function getNextVersion(db: Prisma.TransactionClient) {
  const { version } = await db.replicacheVersionSingleton.upsert({
    where: {
      // This condition should always be true. The whole point
      // of this table is that there is one thing in it.
      id: 0,
    },
    create: { version: 1, id: 0 },
    update: { version: { increment: 1 } },
  });
  return version;
}

export async function createDefaultLayerConfig({
  db,
  version,
  id,
}: {
  db: Prisma.TransactionClient;
  version: number;
  id: string;
}) {
  await db.layerConfig.create({
    data: {
      wrappedFeatureCollectionId: id,
      version,
      at: generateKeyBetween(null, null),
      ...LAYERS.MONOCHROME,
    },
  });
}

const OPPOSITE_DIRECTION: Record<MembershipStatus, MembershipStatus> = {
  PAUSED: "ACTIVE",
  ACTIVE: "PAUSED",
};

/**
 * If this user has a paused membership, reactivate
 * it.
 */
export async function toggleMemberships(
  userId: number,
  direction: MembershipStatus
) {
  const pausedMemberships = await db.membership.findMany({
    select: {
      id: true,
      organizationId: true,
    },
    where: { userId: userId, membershipStatus: OPPOSITE_DIRECTION[direction] },
  });

  if (!pausedMemberships.length) {
    return;
  }

  await db.membership.updateMany({
    where: { id: { in: pausedMemberships.map((membership) => membership.id) } },
    data: { membershipStatus: direction },
  });

  await Promise.all(
    pausedMemberships.map((membership) => {
      return updateQuantityForOrganization(membership.organizationId);
    })
  );
}
