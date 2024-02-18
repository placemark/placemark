import { z } from "zod";

export const CreateWrappedFeatureCollectionFolder = z.object({
  name: z.string().min(1),
  folderId: z.string().uuid().nullable(),
});

export const EditWrappedFeatureCollectionFolder =
  CreateWrappedFeatureCollectionFolder.extend({
    id: z.string().uuid(),
  }).refine((args) => {
    return args.id !== args.folderId;
  });
