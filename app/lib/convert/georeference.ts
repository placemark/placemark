import { ConvertError, parseOrError } from "app/lib/errors";
import { getExtent } from "app/lib/geometry";
import readAsText from "app/lib/read_as_text";
import { EitherAsync } from "purify-ts/EitherAsync";
import type { Feature } from "types";
import type { FileType, ImportOptions } from ".";
import type { GeoreferenceResult } from "./utils";

class CGeoreference implements FileType {
  id = "georeference" as const;
  label = "Georeference Annotation";
  extensions = [".json", ".jsonld"];
  filenames = [] as string[];
  mimes = [] as string[];

  forwardBinary(file: ArrayBuffer, options: ImportOptions) {
    return readAsText(file).chain((text) => this.forwardString(text, options));
  }

  forwardString(text: string, options: ImportOptions) {
    return EitherAsync<Error, GeoreferenceResult>(async ({ liftEither }) => {
      const { points, layer, mask } = options.georeferenceOptions;
      if (!points && !layer && !mask) {
        throw new ConvertError(
          "Select control points, a map layer, or mask polygons to import.",
        );
      }
      const input = await liftEither(parseOrError(text));
      const { parseAnnotation, generateAnnotation } = await import(
        "@allmaps/annotation"
      );
      const maps = parseAnnotation(input);
      if (!maps.length) {
        throw new ConvertError("This annotation contains no maps.");
      }
      const result: GeoreferenceResult = {
        type: "georeference",
        maps: [],
        notes: [],
      };
      const boundsFeatures: Feature[] = [];
      for (const [index, map] of maps.entries()) {
        const name = `Map ${index + 1}`;
        const properties = { mapId: map.id ?? null, imageId: map.resource.id };
        const gcps: Feature[] = map.gcps.map((gcp, i) => ({
          type: "Feature",
          properties: {
            ...properties,
            name: `Control point ${i + 1}`,
            resourceCoords: [...gcp.resource],
          },
          geometry: { type: "Point", coordinates: [...gcp.geo] },
        }));
        const features = points ? [...gcps] : [];
        if (points) boundsFeatures.push(...gcps);
        let canWarp = false;
        if (layer || mask) {
          try {
            const { ProjectedGcpTransformer } = await import(
              "@allmaps/project"
            );
            const { geometryToGeojsonGeometry } = await import(
              "@allmaps/stdlib"
            );
            // Match the renderer's projection and edge refinement settings.
            const transformer = ProjectedGcpTransformer.fromGeoreferencedMap(
              map,
              {
                minOffsetRatio: 0.01,
                maxDepth: 5,
                differentHandedness: true,
              },
            );
            const geometry = geometryToGeojsonGeometry(
              transformer.transformToGeo([map.resourceMask]),
            );
            if (!geometry.coordinates.flat(2).every(Number.isFinite)) {
              throw new Error("The transformed mask has invalid coordinates.");
            }
            const polygon: Feature = {
              type: "Feature",
              properties: { ...properties, name: "Map mask" },
              geometry,
            };
            boundsFeatures.push(polygon);
            if (mask) features.push(polygon);
            canWarp = true;
          } catch (e) {
            result.notes.push(
              `${name}: Could not create the layer or mask. ${e instanceof Error ? e.message : "Invalid transformation."}`,
            );
          }
        }
        result.maps.push({
          name,
          geojson: { type: "FeatureCollection", features },
          ...(layer && canWarp ? { annotation: generateAnnotation(map) } : {}),
        });
      }
      if (
        !result.maps.some(
          (map) => map.annotation || map.geojson.features.length,
        )
      ) {
        throw new ConvertError(
          result.notes.join(" ") ||
            "This annotation contains no control points.",
        );
      }
      result.extent = getExtent({
        type: "FeatureCollection",
        features: boundsFeatures,
      }).extract();
      return result;
    });
  }
}

export const Georeference = new CGeoreference();
