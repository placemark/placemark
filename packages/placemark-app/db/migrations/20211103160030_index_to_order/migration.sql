/*
  Warnings:

  - You are about to drop the column `index` on the `FormField` table. All the data in the column will be lost.
  - Added the required column `order` to the `FormField` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FormField" DROP COLUMN "index",
ADD COLUMN     "order" INTEGER NOT NULL;
