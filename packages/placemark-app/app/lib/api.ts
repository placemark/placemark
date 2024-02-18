import { PersistenceMetadataPersisted } from "./persistence/ipersistence";
import { env } from "app/lib/env_client";
import { IWrappedFeature } from "types";

function mapBaseURLWithoutSlash(metadata: PersistenceMetadataPersisted) {
  return `${env.NEXT_PUBLIC_API_BASE_WITH_SLASH}api/v1/map/${metadata.id}`;
}

/**
 * Get the URL of the feature collection API
 */
export function getAPIURL(metadata: PersistenceMetadataPersisted) {
  return `${mapBaseURLWithoutSlash(metadata)}/featurecollection`;
}

/**
 * Get the URL of a shared map
 */
export function getShareURL(metadata: PersistenceMetadataPersisted) {
  return `${env.NEXT_PUBLIC_DOMAIN_WITH_SLASH}public/${metadata.id}`;
}

/**
 * Get the URL of an individual feature within a map.
 */
export function getAPIURLFeature(
  metadata: PersistenceMetadataPersisted,
  featureId: IWrappedFeature["id"]
) {
  return `${mapBaseURLWithoutSlash(metadata)}/feature/${featureId}`;
}

export function gistUrlFromId(id: string) {
  return `https://gist.github.com/${id}`;
}
