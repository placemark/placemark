/*
  Warnings:

  - Added the required column `version` to the `MapPosition` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "MapPosition" DROP CONSTRAINT "MapPosition_userId_fkey";

-- DropForeignKey
ALTER TABLE "MapboxLayer" DROP CONSTRAINT "MapboxLayer_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Membership" DROP CONSTRAINT "Membership_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Token" DROP CONSTRAINT "Token_userId_fkey";

-- AlterTable
ALTER TABLE "MapPosition" ADD COLUMN     "version" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "MapboxLayer" ADD COLUMN     "createdById" INTEGER;

-- CreateTable
CREATE TABLE "WrappedFeatureCollection" (
    "id" TEXT NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "name" TEXT NOT NULL DEFAULT E'Untitled',

    CONSTRAINT "WrappedFeatureCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WrappedFeature" (
    "id" TEXT NOT NULL,
    "feature" JSONB NOT NULL,
    "version" INTEGER NOT NULL,
    "at" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "wrappedFeatureCollectionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,

    CONSTRAINT "WrappedFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReplicacheClient" (
    "id" TEXT NOT NULL,
    "lastMutationId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReplicacheClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReplicacheVersionSingleton" (
    "id" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,

    CONSTRAINT "ReplicacheVersionSingleton_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WrappedFeature_version_idx" ON "WrappedFeature"("version");

-- CreateIndex
CREATE UNIQUE INDEX "WrappedFeature_wrappedFeatureCollectionId_id_key" ON "WrappedFeature"("wrappedFeatureCollectionId", "id");

-- CreateIndex
CREATE INDEX "MapPosition_userId_idx" ON "MapPosition"("userId");

-- CreateIndex
CREATE INDEX "MapPosition_version_idx" ON "MapPosition"("version");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WrappedFeatureCollection" ADD CONSTRAINT "WrappedFeatureCollection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WrappedFeatureCollection" ADD CONSTRAINT "WrappedFeatureCollection_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WrappedFeature" ADD CONSTRAINT "WrappedFeature_wrappedFeatureCollectionId_fkey" FOREIGN KEY ("wrappedFeatureCollectionId") REFERENCES "WrappedFeatureCollection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WrappedFeature" ADD CONSTRAINT "WrappedFeature_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplicacheClient" ADD CONSTRAINT "ReplicacheClient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapPosition" ADD CONSTRAINT "MapPosition_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Token" ADD CONSTRAINT "Token_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapboxLayer" ADD CONSTRAINT "MapboxLayer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapboxLayer" ADD CONSTRAINT "MapboxLayer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "Membership.invitationToken_unique" RENAME TO "Membership_invitationToken_key";

-- RenameIndex
ALTER INDEX "Membership.organizationId_invitedEmail_unique" RENAME TO "Membership_organizationId_invitedEmail_key";

-- RenameIndex
ALTER INDEX "Membership.organizationId_userId_unique" RENAME TO "Membership_organizationId_userId_key";

-- RenameIndex
ALTER INDEX "Organization.stripeCustomerId_unique" RENAME TO "Organization_stripeCustomerId_key";

-- RenameIndex
ALTER INDEX "Session.handle_unique" RENAME TO "Session_handle_key";

-- RenameIndex
ALTER INDEX "Token.hashedToken_type_unique" RENAME TO "Token_hashedToken_type_key";

-- RenameIndex
ALTER INDEX "User.email_unique" RENAME TO "User_email_key";
