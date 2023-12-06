/*
  Warnings:

  - Made the column `at` on table `WrappedFeature` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "WrappedFeature" ALTER COLUMN "at" SET NOT NULL;
