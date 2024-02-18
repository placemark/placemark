import type { IPresence } from "types";

export function featureCollection({
  wrappedFeatureCollectionId,
}: {
  wrappedFeatureCollectionId: string;
}) {
  return `/fc/${wrappedFeatureCollectionId}`;
}

export function presencePrefix({
  wrappedFeatureCollectionId,
}: {
  wrappedFeatureCollectionId: string;
}) {
  return `/p/${wrappedFeatureCollectionId}`;
}

export function layerConfigPrefix({
  wrappedFeatureCollectionId,
}: {
  wrappedFeatureCollectionId: string;
}) {
  return `/f/${wrappedFeatureCollectionId}/layerConfigs/`;
}

export function presence({
  wrappedFeatureCollectionId,
  replicacheClientId,
}: Pick<IPresence, "wrappedFeatureCollectionId" | "replicacheClientId">) {
  return `/p/${wrappedFeatureCollectionId}/${replicacheClientId}`;
}

export function featurePrefix({
  wrappedFeatureCollectionId,
}: {
  wrappedFeatureCollectionId: string;
}) {
  return `/f/${wrappedFeatureCollectionId}/features/`;
}

export function feature({
  wrappedFeatureCollectionId,
  id,
}: {
  wrappedFeatureCollectionId: string;
  id: string;
}) {
  return `/f/${wrappedFeatureCollectionId}/features/${id}`;
}

export function folderPrefix({
  wrappedFeatureCollectionId,
}: {
  wrappedFeatureCollectionId: string;
}) {
  return `/f/${wrappedFeatureCollectionId}/folders/`;
}

export function folder({
  wrappedFeatureCollectionId,
  id,
}: {
  wrappedFeatureCollectionId: string;
  id: string;
}) {
  return `/f/${wrappedFeatureCollectionId}/folders/${id}`;
}

export function layerConfig({
  wrappedFeatureCollectionId,
  id,
}: {
  wrappedFeatureCollectionId: string;
  id: string;
}) {
  return `/f/${wrappedFeatureCollectionId}/layerConfigs/${id}`;
}
