/*
  Warnings:

  - The primary key for the `Presence` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `Presence` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Presence" DROP CONSTRAINT "Presence_pkey",
DROP COLUMN "id";
