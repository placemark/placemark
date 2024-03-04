import type { Feature, FeatureCollection } from "types";
import type { FileType, ImportOptions } from ".";
import readAsText from "app/lib/read_as_text";
import { GeoJSONLToGeoJSON, GeoJSONToGeoJSONL } from "./local/geojsonl";
import { stringToBlob, ConvertResult } from "./utils";
import { EitherAsync } from "purify-ts/EitherAsync";
import { rough } from "app/lib/roughly_geojson";
import { Right } from "purify-ts/Either";
import type { ConvertError } from "app/lib/errors";

export class CGeoJSONL implements FileType {
  id = "geojsonl" as const;
  label = "GeoJSONL (newline-delimited GeoJSON)";
  extensions = [".geojsonl", ".geojsons", ".ld"];
  filenames = [] as string[];
  mimes = [] as string[];
  forwardString(text: string) {
    return EitherAsync<ConvertError, ConvertResult>(
      async function forwardGeoJSONL({ liftEither }) {
        const res = await liftEither(GeoJSONLToGeoJSON(text));
        return await liftEither(rough(res));
      }
    );
  }
  forwardBinary(file: ArrayBuffer, _options: ImportOptions) {
    return readAsText(file).chain((text) => {
      return this.forwardString(text);
    });
  }
  back({ geojson }: { geojson: FeatureCollection }) {
    return EitherAsync.liftEither(
      Right({
        blob: stringToBlob(GeoJSONToGeoJSONL(geojson)),
        name: "features.geojsonl",
      })
    );
  }
  featureToString(geojson: Feature) {
    return EitherAsync.liftEither(
      Right(
        GeoJSONToGeoJSONL({
          type: "FeatureCollection",
          features: [geojson],
        })
      )
    );
  }
}

export const GeoJSONL = new CGeoJSONL();
