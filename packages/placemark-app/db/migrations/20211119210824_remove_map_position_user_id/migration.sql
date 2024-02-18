/*
  Warnings:

  - You are about to drop the column `userId` on the `MapPosition` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "MapPosition" DROP CONSTRAINT "MapPosition_userId_fkey";

-- DropIndex
DROP INDEX "MapPosition_userId_key";

-- AlterTable
ALTER TABLE "MapPosition" DROP COLUMN "userId";
