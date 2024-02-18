/*
  Warnings:

  - You are about to drop the column `price` on the `Organization` table. All the data in the column will be lost.
  - You are about to drop the column `stripeCustomerId` on the `Organization` table. All the data in the column will be lost.
  - You are about to drop the column `subscriptionStatus` on the `Organization` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Organization_stripeCustomerId_key";

-- AlterTable
ALTER TABLE "Organization" DROP COLUMN "price",
DROP COLUMN "stripeCustomerId",
DROP COLUMN "subscriptionStatus";

-- DropEnum
DROP TYPE "SubscriptionStatus";
