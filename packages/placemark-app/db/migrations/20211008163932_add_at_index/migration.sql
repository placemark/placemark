-- CreateIndex
CREATE INDEX "WrappedFeature_at_idx" ON "WrappedFeature"("at");

-- RenameIndex
ALTER INDEX "MapPosition_userId_unique" RENAME TO "MapPosition_userId_key";
