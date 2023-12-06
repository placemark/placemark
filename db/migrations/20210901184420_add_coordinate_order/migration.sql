-- CreateEnum
CREATE TYPE "CoordinateOrder" AS ENUM ('LONLAT', 'LATLON');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "coordinateOrder" "CoordinateOrder" NOT NULL DEFAULT E'LONLAT';
