-- CreateEnum
CREATE TYPE "FormFieldType" AS ENUM ('text', 'select');

-- AlterTable
ALTER TABLE "WrappedFeatureCollection" ADD COLUMN     "formId" INTEGER;

-- CreateTable
CREATE TABLE "Form" (
    "id" SERIAL NOT NULL,

    CONSTRAINT "Form_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormField" (
    "formId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FormFieldType" NOT NULL,
    "selectOptions" TEXT[],
    "index" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "FormField_formId_name_key" ON "FormField"("formId", "name");

-- AddForeignKey
ALTER TABLE "WrappedFeatureCollection" ADD CONSTRAINT "WrappedFeatureCollection_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormField" ADD CONSTRAINT "FormField_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
