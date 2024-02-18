-- AlterTable
ALTER TABLE "WrappedFeatureCollection" ADD COLUMN     "wrappedFeatureCollectionFolderId" UUID;

-- CreateTable
CREATE TABLE "WrappedFeatureCollectionFolder" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "at" TEXT NOT NULL DEFAULT 'a0',
    "name" TEXT NOT NULL DEFAULT 'New folder',
    "createdById" INTEGER,
    "folderId" UUID,
    "organizationId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WrappedFeatureCollectionFolder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WrappedFeatureCollectionFolder_folderId_idx" ON "WrappedFeatureCollectionFolder"("folderId");

-- CreateIndex
CREATE INDEX "WrappedFeatureCollection_wrappedFeatureCollectionFolderId_idx" ON "WrappedFeatureCollection"("wrappedFeatureCollectionFolderId");

-- AddForeignKey
ALTER TABLE "WrappedFeatureCollection" ADD CONSTRAINT "WrappedFeatureCollection_wrappedFeatureCollectionFolderId_fkey" FOREIGN KEY ("wrappedFeatureCollectionFolderId") REFERENCES "WrappedFeatureCollectionFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WrappedFeatureCollectionFolder" ADD CONSTRAINT "WrappedFeatureCollectionFolder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WrappedFeatureCollectionFolder" ADD CONSTRAINT "WrappedFeatureCollectionFolder_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "WrappedFeatureCollectionFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WrappedFeatureCollectionFolder" ADD CONSTRAINT "WrappedFeatureCollectionFolder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
