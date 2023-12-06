-- AlterEnum
ALTER TYPE "MapboxLayerType" ADD VALUE 'TILEJSON';

-- CreateTable
CREATE TABLE "LayerConfig" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "at" TEXT NOT NULL,
    "visibility" BOOLEAN NOT NULL DEFAULT true,
    "opacity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "version" INTEGER NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT NOT NULL DEFAULT 'Untitled',
    "wrappedFeatureCollectionId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "token" TEXT NOT NULL DEFAULT '',
    "type" "MapboxLayerType" NOT NULL DEFAULT 'MAPBOX',
    "tms" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LayerConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LayerConfig_wrappedFeatureCollectionId_idx" ON "LayerConfig"("wrappedFeatureCollectionId");

-- CreateIndex
CREATE INDEX "LayerConfig_version_idx" ON "LayerConfig"("version");

-- CreateIndex
CREATE INDEX "LayerConfig_deleted_idx" ON "LayerConfig"("deleted");

-- AddForeignKey
ALTER TABLE "LayerConfig" ADD CONSTRAINT "LayerConfig_wrappedFeatureCollectionId_fkey" FOREIGN KEY ("wrappedFeatureCollectionId") REFERENCES "WrappedFeatureCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
