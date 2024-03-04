import { PlacemarkError } from "./errors";
import { EitherAsync } from "purify-ts/EitherAsync";

export default function readAsText(
  file: ArrayBuffer
): EitherAsync<PlacemarkError, string> {
  return EitherAsync(function readAsTextInner() {
    return Promise.resolve(new TextDecoder().decode(file));
  });
}
