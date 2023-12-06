-- CreateEnum
CREATE TYPE "WalkthroughState" AS ENUM ('V1_00_CREATEMAP', 'V1_01_MENU', 'V1_02_MODES', 'V1_03_SEARCH', 'V1_03a_VISUAL', 'V1_04_SHARE', 'V1_05_DONE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "walkthroughState" "WalkthroughState" NOT NULL DEFAULT 'V1_00_CREATEMAP';

UPDATE "User" SET "walkthroughState" = 'V1_05_DONE';
