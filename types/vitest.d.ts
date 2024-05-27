import "vitest";
// eslint-disable-next-line
import type { Assertion, AsymmetricMatchersContaining } from "vitest";

interface CustomMatchers<R = unknown> {
  /**
   * Says that this is the purify-js "Left" type
   */
  toBeLeft(): R;
  toBeRight(): R;
  toBeNothing(): R;
  toBeJust(): R;
  toEqualRight(expected: unknown): R;
  toEqualLeft(expected: unknown): R;
}

declare module "vitest" {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}
