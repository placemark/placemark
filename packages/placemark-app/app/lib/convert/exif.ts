import type { FileType, ImportOptions } from ".";
import { ConvertResult, okResult } from "./utils";
// import { ConvertError } from "lib/errors";
import { EitherAsync } from "purify-ts/EitherAsync";
import type { ConvertError } from "app/lib/errors";

// https://github.com/geotiffjs/cog-explorer/blob/master/src/components/mapview.jsx#L202
export class CEXIF implements FileType {
  id = "exif" as const;
  label = "EXIF (JPEG)";
  extensions = [".jpg", ".jpeg"];
  filenames = [] as string[];
  mimes = [] as string[];
  forwardBinary(file: ArrayBuffer, _options: ImportOptions) {
    return EitherAsync<ConvertError, ConvertResult>(async function eitherExif({
      fromPromise,
    }) {
      const exif = await import("vendor/exif");
      const ret = await fromPromise(exif.toGeoJSON(file));
      return okResult(ret);
    });
  }
}

export const EXIF = new CEXIF();
