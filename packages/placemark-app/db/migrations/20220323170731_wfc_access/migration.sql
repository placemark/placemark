-- CreateEnum
CREATE TYPE "WrappedFeatureCollectionAccess" AS ENUM ('PRIVATE', 'PUBLIC');

-- AlterTable
ALTER TABLE "WrappedFeatureCollection" ADD COLUMN     "access" "WrappedFeatureCollectionAccess" NOT NULL DEFAULT E'PRIVATE';
