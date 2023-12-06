/*
  Warnings:

  - You are about to drop the column `formId` on the `WrappedFeatureCollection` table. All the data in the column will be lost.
  - You are about to drop the `Form` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FormField` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "FormField" DROP CONSTRAINT "FormField_formId_fkey";

-- DropForeignKey
ALTER TABLE "WrappedFeatureCollection" DROP CONSTRAINT "WrappedFeatureCollection_formId_fkey";

-- AlterTable
ALTER TABLE "WrappedFeatureCollection" DROP COLUMN "formId";

-- DropTable
DROP TABLE "Form";

-- DropTable
DROP TABLE "FormField";

-- DropEnum
DROP TYPE "FormFieldType";
