/*
  Warnings:

  - A unique constraint covering the columns `[wrappedFeatureCollectionId,at]` on the table `WrappedFeature` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "WrappedFeature" ALTER COLUMN "at" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "WrappedFeature_wrappedFeatureCollectionId_at_key" ON "WrappedFeature"("wrappedFeatureCollectionId", "at");
