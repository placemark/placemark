/*
  Warnings:

  - A unique constraint covering the columns `[organizationId,userId]` on the table `Membership` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Membership.organizationId_userId_unique" ON "Membership"("organizationId", "userId");
