import readAsText from "app/lib/read_as_text";
import type { FileType } from ".";
import { toDom, okResult, ConvertResult } from "./utils";
import { EitherAsync } from "purify-ts/EitherAsync";
import type { ConvertError } from "app/lib/errors";
import { FeatureCollection } from "types";

export class CTCX implements FileType {
  id = "tcx" as const;
  label = "TCX";
  extensions = [".tcx"];
  filenames = [] as string[];
  mimes = [] as string[];
  forwardBinary(file: ArrayBuffer) {
    return readAsText(file).chain((text) => TCX.forwardString(text));
  }
  forwardString(text: string) {
    return EitherAsync<ConvertError, ConvertResult>(
      async function forwardTcx() {
        const tcx = await import("@tmcw/togeojson").then(
          (module) => module.tcx
        );
        const geojson = tcx(await toDom(text));
        return okResult(geojson as FeatureCollection);
      }
    );
  }
}

export const TCX = new CTCX();
