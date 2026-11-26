import { EitherAsync } from "purify-ts/EitherAsync";
import type { PlacemarkError } from "./errors";

export default function readAsText(
  file: Uint8Array,
): EitherAsync<PlacemarkError, string> {
  return EitherAsync(function readAsTextInner() {
    return Promise.resolve(new TextDecoder().decode(file));
  });
}
