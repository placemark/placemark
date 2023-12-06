import type { FileType, ImportOptions } from ".";
import { okResult, ConvertResult } from "./utils";
import { EitherAsync } from "purify-ts/EitherAsync";
import type { ConvertError } from "app/lib/errors";

// https://github.com/geotiffjs/cog-explorer/blob/master/src/components/mapview.jsx#L202
export class CGeoTIFF implements FileType {
  id = "geotiff" as const;
  label = "GeoTIFF";
  extensions = [".tif", ".tiff"];
  filenames = [] as string[];
  mimes = [] as string[];
  forwardBinary(file: ArrayBuffer, _options?: ImportOptions) {
    return EitherAsync<ConvertError, ConvertResult>(
      async function forwardGeoTIFF() {
        const { getGeotiffExtent } = await import("vendor/geotiff");
        const extent = await getGeotiffExtent(file);
        return okResult(extent);
      }
    );
  }
}

export const GeoTIFF = new CGeoTIFF();
