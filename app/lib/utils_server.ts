import { AuthenticatedCtx } from "blitz";
import LAYERS from "app/lib/default_layers";
import db, { MembershipStatus, Prisma } from "db";
import { generateKeyBetween } from "fractional-indexing";
import { JsonValue } from "type-fest";
import {
  ISymbolization,
  Symbolization,
  tryUpgrading,
  SYMBOLIZATION_NONE,
} from "types";
import { safeParseMaybe } from "./utils";

export function getWrappedFeatureCollection(id: string, ctx: AuthenticatedCtx) {
  return db.wrappedFeatureCollection.findFirstOrThrow({
    where: {
      id,
      organization: {
        id: ctx.session.orgId!,
      },
    },
  });
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
}
