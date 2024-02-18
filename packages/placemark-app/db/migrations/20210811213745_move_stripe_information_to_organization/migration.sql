/*
  Warnings:

  - You are about to drop the column `price` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `stripeCustomerId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `stripeId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `subscriptionStatus` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[stripeCustomerId]` on the table `Organization` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "User.stripeCustomerId_unique";

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "price" TEXT,
ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripeId" TEXT,
ADD COLUMN     "subscriptionStatus" "SubscriptionStatus" DEFAULT E'incomplete';

-- AlterTable
ALTER TABLE "User" DROP COLUMN "price",
DROP COLUMN "stripeCustomerId",
DROP COLUMN "stripeId",
DROP COLUMN "subscriptionStatus";

-- CreateIndex
CREATE UNIQUE INDEX "Organization.stripeCustomerId_unique" ON "Organization"("stripeCustomerId");
