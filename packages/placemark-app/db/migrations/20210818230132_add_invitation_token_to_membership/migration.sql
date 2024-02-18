/*
  Warnings:

  - A unique constraint covering the columns `[invitationToken]` on the table `Membership` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Membership" ADD COLUMN     "invitationToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Membership.invitationToken_unique" ON "Membership"("invitationToken");
