/*
  Warnings:

  - A unique constraint covering the columns `[workOsId]` on the table `Organization` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[workOsId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "workOsId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "workOsId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Organization_workOsId_key" ON "Organization"("workOsId");

-- CreateIndex
CREATE UNIQUE INDEX "User_workOsId_key" ON "User"("workOsId");
