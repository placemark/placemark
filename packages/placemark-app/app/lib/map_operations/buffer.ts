import type { Feature } from "types";
import type { BufferOptions } from "app/lib/buffer";
import { lib } from "app/lib/worker";

export async function buffer(feature: Feature, options: BufferOptions) {
  return lib.bufferFeature(feature, options);
}

export default buffer;
