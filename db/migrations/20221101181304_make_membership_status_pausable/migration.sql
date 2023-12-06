-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'PAUSED');

-- AlterTable
ALTER TABLE "Membership" ADD COLUMN     "membershipStatus" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE';
