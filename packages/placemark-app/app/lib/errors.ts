import { Either } from "purify-ts/Either";
import { JsonValue } from "type-fest";
import { ERROR_CODES } from "app/lib/constants";

export class PlacemarkError extends Error {
  name = "PlacemarkError";
}

export class ConvertError extends PlacemarkError {
  name = "ConvertError";
}

export class GeometryError extends PlacemarkError {
  name = "GeometryError";
}

export class QuotaError extends PlacemarkError {
  name = "QuotaError";
}

export class SSOError {
  code: keyof typeof ERROR_CODES;
  constructor(code: keyof typeof ERROR_CODES) {
    this.code = code;
  }
}

export function parseOrError<T = JsonValue>(str: string) {
  return Either.encase(() => {
    return JSON.parse(str) as T;
  });
}
