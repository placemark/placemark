-- DropForeignKey
ALTER TABLE "WrappedFeature" DROP CONSTRAINT "WrappedFeature_wrappedFeatureCollectionId_fkey";

-- DropForeignKey
ALTER TABLE "WrappedFeatureCollection" DROP CONSTRAINT "WrappedFeatureCollection_organizationId_fkey";

-- AddForeignKey
ALTER TABLE "WrappedFeatureCollection" ADD CONSTRAINT "WrappedFeatureCollection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WrappedFeature" ADD CONSTRAINT "WrappedFeature_wrappedFeatureCollectionId_fkey" FOREIGN KEY ("wrappedFeatureCollectionId") REFERENCES "WrappedFeatureCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
