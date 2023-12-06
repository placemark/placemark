-- DropIndex
DROP INDEX "Presence_replicacheClientId_wrappedFeatureCollectionId_key";

-- CreateIndex
CREATE INDEX "Presence_wrappedFeatureCollectionId_idx" ON "Presence"("wrappedFeatureCollectionId");
