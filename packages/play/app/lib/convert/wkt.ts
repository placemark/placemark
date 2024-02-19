import readAsText from "app/lib/read_as_text";
import type { FileType } from ".";
import type { Feature } from "types";
import { EitherAsync } from "purify-ts/EitherAsync";
import { ConvertResult } from "./utils";
import { ConvertError } from "app/lib/errors";
import { rough } from "app/lib/roughly_geojson";
import { Maybe } from "purify-ts/Maybe";

export class CWKT implements FileType {
  id = "wkt" as const;
  label = "WKT";
  extensions = [] as string[];
  filenames = [] as string[];
  mimes = [] as string[];
  forwardBinary(file: ArrayBuffer) {
    return readAsText(file).chain((text) => {
      return this.forwardString(text);
    });
  }
  forwardString(text: string) {
    return EitherAsync<ConvertError, ConvertResult>(async function forwardWkt({
      liftEither,
    }) {
      const parse = await import("betterknown").then((mod) => mod.wktToGeoJSON);
      const proj = await import("proj4");
      const geojson = await liftEither(
        Maybe.encase(() => {
          return parse(text, {
            proj: (a, b, coord) => {
              return proj.default(a, b, coord);
            },
          });
        })
          .chainNullable((x) => x)
          .toEither(new ConvertError("Could not convert WKT"))
          .chain((geojson) => rough(geojson))
      );
      return geojson;
    });
  }
  featureToString(geojson: Feature) {
    return EitherAsync<ConvertError, string>(
      async function featureToStringWkt() {
        const stringify = await import("betterknown").then(
          (mod) => mod.geoJSONToWkt
        );
        if (geojson.geometry === null) return "";
        return Maybe.fromNullable(stringify(geojson.geometry)).orDefault("");
      }
    );
  }
}

export const WKT = new CWKT();
