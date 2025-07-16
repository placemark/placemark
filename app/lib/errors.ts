import { Either } from "purify-ts/Either";
import type { JsonValue } from "type-fest";

export class PlacemarkError extends Error {
  name = "PlacemarkError";
}

export class ConvertError extends PlacemarkError {
  name = "ConvertError";
}

export class GeometryError extends PlacemarkError {
  name = "GeometryError";
}

export function parseOrError<T = JsonValue>(str: string) {
  return Either.encase(() => {
    return JSON.parse(str) as T;
  });
}
