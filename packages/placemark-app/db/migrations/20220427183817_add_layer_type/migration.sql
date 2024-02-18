-- CreateEnum
CREATE TYPE "MapboxLayerType" AS ENUM ('MAPBOX', 'XYZ');

-- AlterTable
ALTER TABLE "MapboxLayer" ADD COLUMN     "type" "MapboxLayerType" NOT NULL DEFAULT E'MAPBOX',
ALTER COLUMN "token" SET DEFAULT E'';
