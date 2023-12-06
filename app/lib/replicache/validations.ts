import { z } from "zod";
import { createPushRequestValidator } from "app/lib/replicache/validation_utils";
import { Folder, Presence /*, WrappedFeature*/, zLayerConfig } from "types";
import type { AuthenticatedSessionContext } from "@blitzjs/auth";

const id = z.string();

const DeleteFolders = z.object({
  folders: z.array(id),
  wrappedFeatureCollectionId: id,
});

const PutFolders = z.object({
  folders: z.array(Folder),
  wrappedFeatureCollectionId: id,
});

const DeleteFeatures = z.object({
  features: z.array(id),
  wrappedFeatureCollectionId: id,
});

const PutFeatures = z.object({
  features: z.array(z.any()),
  wrappedFeatureCollectionId: id,
});

const PutLayerConfigs = z.object({
  layerConfigs: z.array(zLayerConfig),
  wrappedFeatureCollectionId: id,
});

const DeleteLayerConfigs = z.object({
  layerConfigs: z.array(id),
  wrappedFeatureCollectionId: id,
});

const PutPresence = Presence.partial({ replicacheClientId: true });

export const mutatorSchema = {
  deleteFolders: DeleteFolders,
  putFolders: PutFolders,
  deleteFeatures: DeleteFeatures,
  putFeatures: PutFeatures,
  putPresence: PutPresence,

  putLayerConfigs: PutLayerConfigs,
  deleteLayerConfigs: DeleteLayerConfigs,
};

export type SimplifiedAuthenticatedSessionContext = Pick<
  AuthenticatedSessionContext,
  "userId" | "orgId"
>;

export const pushRequestValidator = createPushRequestValidator(mutatorSchema);

export type IPushRequest = z.infer<typeof pushRequestValidator>;
export type IMutation = IPushRequest["mutations"][0];
