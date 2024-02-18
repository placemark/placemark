/*
  Warnings:

  - You are about to drop the column `latitude` on the `Presence` table. All the data in the column will be lost.
  - You are about to drop the column `longitude` on the `Presence` table. All the data in the column will be lost.
  - You are about to drop the column `zoom` on the `Presence` table. All the data in the column will be lost.
  - Added the required column `cursorLatitude` to the `Presence` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cursorLongitude` to the `Presence` table without a default value. This is not possible if the table is not empty.
  - Added the required column `maxx` to the `Presence` table without a default value. This is not possible if the table is not empty.
  - Added the required column `maxy` to the `Presence` table without a default value. This is not possible if the table is not empty.
  - Added the required column `minx` to the `Presence` table without a default value. This is not possible if the table is not empty.
  - Added the required column `miny` to the `Presence` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Presence" DROP COLUMN "latitude",
DROP COLUMN "longitude",
DROP COLUMN "zoom",
ADD COLUMN     "cursorLatitude" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "cursorLongitude" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "maxx" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "maxy" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "minx" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "miny" DOUBLE PRECISION NOT NULL;
