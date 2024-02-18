/*
  Warnings:

  - You are about to drop the column `membershipId` on the `MapboxLayer` table. All the data in the column will be lost.
  - Added the required column `organizationId` to the `MapboxLayer` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "MapboxLayer" DROP CONSTRAINT "MapboxLayer_membershipId_fkey";

-- AlterTable
ALTER TABLE "MapboxLayer" DROP COLUMN "membershipId",
ADD COLUMN     "organizationId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "MapboxLayer" ADD FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
