/*
  Warnings:

  - You are about to drop the column `userId` on the `MapboxLayer` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[orgId,url]` on the table `MapboxLayer` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `orgId` to the `MapboxLayer` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "MapboxLayer" DROP CONSTRAINT "MapboxLayer_userId_fkey";

-- DropIndex
DROP INDEX "MapboxLayer.userId_url_unique";

-- AlterTable
ALTER TABLE "MapboxLayer" DROP COLUMN "userId",
ADD COLUMN     "orgId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "MapboxLayer.orgId_url_unique" ON "MapboxLayer"("orgId", "url");

-- AddForeignKey
ALTER TABLE "MapboxLayer" ADD FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
