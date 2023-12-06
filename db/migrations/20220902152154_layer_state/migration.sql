-- CreateEnum
CREATE TYPE "DefaultLayer" AS ENUM ('MONOCHROME', 'DARK', 'SATELLITE', 'STREETS');

-- AlterTable
ALTER TABLE "WrappedFeatureCollection" ADD COLUMN     "defaultLayer" "DefaultLayer" DEFAULT 'MONOCHROME',
ADD COLUMN     "layerId" INTEGER;

-- AddForeignKey
ALTER TABLE "WrappedFeatureCollection" ADD CONSTRAINT "WrappedFeatureCollection_layerId_fkey" FOREIGN KEY ("layerId") REFERENCES "MapboxLayer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
