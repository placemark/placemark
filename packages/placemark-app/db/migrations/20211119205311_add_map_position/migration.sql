/*
  Warnings:

  - A unique constraint covering the columns `[replicacheClientId]` on the table `MapPosition` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[replicacheClientId,wrappedFeatureCollectionId]` on the table `MapPosition` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `replicacheClientId` to the `MapPosition` table without a default value. This is not possible if the table is not empty.
  - Added the required column `wrappedFeatureCollectionId` to the `MapPosition` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "MapPosition_userId_idx";

-- AlterTable
ALTER TABLE "MapPosition" ADD COLUMN     "replicacheClientId" TEXT NOT NULL,
ADD COLUMN     "wrappedFeatureCollectionId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "MapPosition_replicacheClientId_key" ON "MapPosition"("replicacheClientId");

-- CreateIndex
CREATE UNIQUE INDEX "MapPosition_replicacheClientId_wrappedFeatureCollectionId_key" ON "MapPosition"("replicacheClientId", "wrappedFeatureCollectionId");

-- AddForeignKey
ALTER TABLE "MapPosition" ADD CONSTRAINT "MapPosition_wrappedFeatureCollectionId_fkey" FOREIGN KEY ("wrappedFeatureCollectionId") REFERENCES "WrappedFeatureCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapPosition" ADD CONSTRAINT "MapPosition_replicacheClientId_fkey" FOREIGN KEY ("replicacheClientId") REFERENCES "ReplicacheClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
