/*
  Warnings:

  - You are about to drop the `MapPosition` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "MapPosition" DROP CONSTRAINT "MapPosition_replicacheClientId_fkey";

-- DropForeignKey
ALTER TABLE "MapPosition" DROP CONSTRAINT "MapPosition_wrappedFeatureCollectionId_fkey";

-- DropTable
DROP TABLE "MapPosition";

-- CreateTable
CREATE TABLE "Presence" (
    "id" SERIAL NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "zoom" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL,
    "wrappedFeatureCollectionId" TEXT NOT NULL,
    "replicacheClientId" TEXT NOT NULL,

    CONSTRAINT "Presence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Presence_replicacheClientId_key" ON "Presence"("replicacheClientId");

-- CreateIndex
CREATE INDEX "Presence_version_idx" ON "Presence"("version");

-- CreateIndex
CREATE UNIQUE INDEX "Presence_replicacheClientId_wrappedFeatureCollectionId_key" ON "Presence"("replicacheClientId", "wrappedFeatureCollectionId");

-- AddForeignKey
ALTER TABLE "Presence" ADD CONSTRAINT "Presence_wrappedFeatureCollectionId_fkey" FOREIGN KEY ("wrappedFeatureCollectionId") REFERENCES "WrappedFeatureCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presence" ADD CONSTRAINT "Presence_replicacheClientId_fkey" FOREIGN KEY ("replicacheClientId") REFERENCES "ReplicacheClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
