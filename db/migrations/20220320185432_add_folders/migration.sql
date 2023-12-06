-- AlterTable
ALTER TABLE "WrappedFeature" ADD COLUMN     "folderId" UUID;

-- CreateTable
CREATE TABLE "Folder" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "at" TEXT NOT NULL DEFAULT E'a0',
    "name" TEXT NOT NULL DEFAULT E'New folder',
    "wrappedFeatureCollectionId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "visibility" BOOLEAN NOT NULL DEFAULT true,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "expanded" BOOLEAN NOT NULL DEFAULT true,
    "folderId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Folder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Folder_version_idx" ON "Folder"("version");

-- CreateIndex
CREATE INDEX "Folder_deleted_idx" ON "Folder"("deleted");

-- CreateIndex
CREATE INDEX "Folder_wrappedFeatureCollectionId_idx" ON "Folder"("wrappedFeatureCollectionId");

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_wrappedFeatureCollectionId_fkey" FOREIGN KEY ("wrappedFeatureCollectionId") REFERENCES "WrappedFeatureCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WrappedFeature" ADD CONSTRAINT "WrappedFeature_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
