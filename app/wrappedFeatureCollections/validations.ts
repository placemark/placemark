import { z } from "zod";
import { Folder, WrappedFeature } from "types";
import { name } from "app/core/utils";

export const CreateWrappedFeatureCollection = z.object({
  name,
  folderId: z.string().uuid().nullable().default(null),
});

export const CreateWrappedFeatureCollectionWithFeatures = z.object({
  name,
  wrappedFeatures: z.array(WrappedFeature),
  folders: z.array(Folder),
});

export const DuplicateWrappedFeatureCollection = z.object({
  id: z.string(),
});

export const ZDefaultLayer = z.string();
