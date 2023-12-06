import { z } from "zod";
import { DefaultLayer, WrappedFeatureCollectionAccess } from "@prisma/client";
import { Folder, Symbolization, WrappedFeature } from "types";
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

export const GistWrappedFeatureCollection = z.object({
  id: z.string(),
  saveAs: z.boolean().optional(),
});

export const ZDefaultLayer = z.nativeEnum(DefaultLayer);

export const EditWrappedFeatureCollection = z.object({
  id: z.string(),
  name: z.optional(name),
  label: z.optional(z.string()),
  layerId: z.optional(z.number().int().nullable()),
  defaultLayer: z.optional(ZDefaultLayer.nullable()),
  access: z.optional(z.nativeEnum(WrappedFeatureCollectionAccess)),
  symbolization: z.optional(Symbolization),
  wrappedFeatureCollectionFolderId: z.string().uuid().nullable().optional(),
});
