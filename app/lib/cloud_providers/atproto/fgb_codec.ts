import { adjustForFgb } from "app/lib/convert/flatgeobuf";
import type { JsonValue } from "type-fest";
import type { Feature, FeatureCollection, IWrappedFeature } from "types";

const ID_KEY = "__pm_id";
const AT_KEY = "__pm_at";
const FOLDER_ID_KEY = "__pm_folderId";
const PROPS_KEY = "__pm_props";

// flatgeobuf infers its column schema from features[0].properties alone,
// silently dropping any key the first feature lacks. So user properties
// never become FlatGeobuf columns: every feature gets the same four
// reserved string columns, with the whole properties object JSON-encoded
// into __pm_props.
export async function encodeFeaturesToFlatGeobuf(
  features: IWrappedFeature[],
): Promise<Uint8Array> {
  const flatgeobuf = await import("flatgeobuf/geojson");

  const persistable = features.filter((wrapped) => !wrapped.ephemeral);

  const collection: FeatureCollection = {
    type: "FeatureCollection",
    features: persistable.map(
      (wrapped): Feature => ({
        ...wrapped.feature,
        properties: {
          [ID_KEY]: wrapped.id,
          [AT_KEY]: wrapped.at,
          [FOLDER_ID_KEY]: wrapped.folderId,
          [PROPS_KEY]: JSON.stringify(wrapped.feature.properties ?? null),
        },
      }),
    ),
  };

  const adjusted = adjustForFgb(collection);

  // Return empty buffer if no features reach serialization
  // (adjustForFgb filters out features with null geometries)
  if (adjusted.features.length === 0) {
    return new Uint8Array();
  }

  return flatgeobuf.serialize(adjusted) as Uint8Array;
}

function readString(properties: Record<string, unknown>, key: string): string {
  const value = properties[key];
  if (typeof value !== "string") {
    throw new Error(`FlatGeobuf feature is missing the ${key} column`);
  }
  return value;
}

function isJsonObject(value: unknown): value is { [name: string]: JsonValue } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readProperties(
  properties: Record<string, unknown>,
): Feature["properties"] {
  const raw = properties[PROPS_KEY];
  if (typeof raw !== "string") {
    return null;
  }
  const parsed: unknown = JSON.parse(raw);
  return isJsonObject(parsed) ? parsed : null;
}

export async function decodeFlatGeobufToFeatures(
  bytes: Uint8Array,
): Promise<IWrappedFeature[]> {
  // Handle empty bytes
  if (bytes.length === 0) {
    return [];
  }

  const flatgeobuf = await import("flatgeobuf/geojson");

  const wrapped: IWrappedFeature[] = [];
  const iterator = flatgeobuf.deserialize(bytes);
  for await (const feature of iterator) {
    const properties: Record<string, unknown> = {
      ...(feature.properties ?? {}),
    };
    const id = readString(properties, ID_KEY);
    const at = readString(properties, AT_KEY);
    // FlatGeobuf doesn't preserve null, so undefined should be converted back to null
    const folderIdValue = properties[FOLDER_ID_KEY];
    const folderId = typeof folderIdValue === "string" ? folderIdValue : null;

    wrapped.push({
      id,
      at,
      folderId,
      // Rebuilt field-by-field: flatgeobuf synthesizes its own feature.id
      // that was never encoded, so spreading would leak it through.
      feature: {
        type: "Feature",
        geometry: feature.geometry,
        properties: readProperties(properties),
      },
    });
  }
  return wrapped;
}
