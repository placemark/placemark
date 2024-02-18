/*
  Warnings:

  - The primary key for the `WrappedFeature` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `WrappedFeature` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "WrappedFeature" DROP CONSTRAINT "WrappedFeature_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
ADD CONSTRAINT "WrappedFeature_pkey" PRIMARY KEY ("id");
