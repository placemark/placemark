-- CreateEnum
CREATE TYPE "LengthUnit" AS ENUM ('centimeters', 'degrees', 'feet', 'inches', 'kilometers', 'meters', 'miles', 'millimeters', 'nauticalmiles', 'radians', 'yards');

-- CreateEnum
CREATE TYPE "AreaUnit" AS ENUM ('acres', 'centimeters', 'feet', 'hectares', 'inches', 'kilometers', 'meters', 'miles', 'millimeters', 'yards');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "areaUnits" "AreaUnit" NOT NULL DEFAULT E'meters',
ADD COLUMN     "lengthUnits" "LengthUnit" NOT NULL DEFAULT E'meters';
