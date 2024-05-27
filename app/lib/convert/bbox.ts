import type { Feature } from "types";
import { parseBBOX, bboxToPolygon, getExtent, e6bbox } from "app/lib/geometry";
import type { FileType, ImportOptions } from ".";
import { okResult } from "./utils";
import { EitherAsync } from "purify-ts/EitherAsync";
import type { ConvertError } from "app/lib/errors";
import readAsText from "app/lib/read_as_text";
import { eitherToAsync } from "app/lib/utils";
import { Maybe } from "purify-ts/Maybe";

export class CBBOX implements FileType {
  id = "bbox" as const;
  label = "BBOX";
  extensions = [] as string[];
  filenames = [] as string[];
  mimes = [] as string[];
  forwardString(text: string, _options?: ImportOptions) {
    return eitherToAsync(
      parseBBOX(text).map((bbox) => {
        return okResult({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: bboxToPolygon(bbox),
              properties: {},
            },
          ],
        });
      })
    );
  }
  featureToString(feature: Feature) {
    return EitherAsync<ConvertError, string>(function featureToStringBbox() {
      const { geometry } = feature;
      const bbox = Maybe.fromNullable(geometry).chain(getExtent);
      return Promise.resolve(bbox.mapOrDefault(e6bbox, ""));
    });
  }
  forwardBinary(file: ArrayBuffer, options: ImportOptions) {
    return readAsText(file).chain((text) => {
      return this.forwardString(text, options);
    });
  }
}

export const BBOX = new CBBOX();
