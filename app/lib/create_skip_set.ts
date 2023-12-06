import type { IWrappedFeature } from "types";
import type { IMutation } from "./replicache/validations";

/**
 * This method tries to mark mutations that will be overwritten later
 * in the cycle, to cut down dramatically on client calls to the database.
 */
export function createSkipSet(mutations: IMutation[]): Set<IMutation> {
  const skips = new Set<IMutation>();

  let seenPutPresence = false;
  const seenPutFeatures = new Set<IWrappedFeature["id"]>();

  for (const mutation of mutations.slice().reverse()) {
    switch (mutation.name) {
      case "putFolders":
      case "putLayerConfigs":
      case "deleteLayerConfigs":
      case "deleteFolders":
      case "deleteFeatures":
        // Ignore deleteFeatures. It doesn't really matter if
        // we have duplicate deleteFeatures
        break;
      case "putFeatures": {
        const features = mutation.args.features as IWrappedFeature[];
        if (features.length === 1) {
          // Only optimize for this one particular case, of a single feature
          // being affected.
          const id = features[0].id;
          if (!seenPutFeatures.has(id)) {
            // If this is the last time we affect this feature,
            // allow this invocation
            seenPutFeatures.add(id);
          } else {
            // Otherwise, skip this mutation.
            skips.add(mutation);
          }
        }
        break;
      }
      case "putPresence":
        // The rule for putPresence is simple: all putPresence
        // mutations target the same data, so only take the last one.
        if (seenPutPresence === false) {
          // This is the last putPresence call. If there is
          // an earlier one, skip it.
          seenPutPresence = true;
        } else {
          skips.add(mutation);
        }

        break;
    }
  }

  return skips;
}
