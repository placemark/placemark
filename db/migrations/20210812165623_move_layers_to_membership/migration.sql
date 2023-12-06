/*
  Warnings:

  - You are about to drop the column `orgId` on the `MapboxLayer` table. All the data in the column will be lost.
  - Added the required column `membershipId` to the `MapboxLayer` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "MapboxLayer" DROP CONSTRAINT "MapboxLayer_orgId_fkey";

-- DropIndex
DROP INDEX "MapboxLayer.orgId_url_unique";

-- AlterTable
ALTER TABLE "MapboxLayer" DROP COLUMN "orgId",
ADD COLUMN     "membershipId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "MapboxLayer" ADD FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
