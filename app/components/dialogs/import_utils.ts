import type { Folder, Root } from "@tmcw/togeojson";
import type { ConvertResult } from "app/lib/convert/utils";
import { getExtent } from "app/lib/geometry";
import { Maybe } from "purify-ts/Maybe";
import type { Feature, FeatureCollection } from "types";

function flattenRoot(root: Root | Folder, features: Feature[] = []) {
  for (const child of root.children) {
    switch (child.type) {
      case "Feature": {
        features.push(child);
        break;
      }
      case "folder": {
        flattenRoot(child, features);
        break;
      }
    }
  }

  return features;
}

export function flattenResult(result: ConvertResult): FeatureCollection {
  switch (result.type) {
    case "georeference":
      return {
        type: "FeatureCollection",
        features: result.maps.flatMap((map) => map.geojson.features),
      };
    case "geojson":
      return result.geojson;
    case "root":
      return {
        type: "FeatureCollection",
        features: flattenRoot(result.root),
      };
  }
}

export function getImportExtent(result: ConvertResult) {
  return result.type === "georeference"
    ? Maybe.fromNullable(result.extent)
    : getExtent(flattenResult(result));
}
