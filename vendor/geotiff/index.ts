import GeoTIFF from "./geotiff";

/**
 * Construct a GeoTIFF from the bytes of a TIFF file.
 */
export function fromBytes(bytes: Uint8Array) {
  return GeoTIFF.fromSource({
    fetch(start: number, length: number) {
      const range = bytes.subarray(start, start + length);
      const buffer = new ArrayBuffer(range.byteLength);
      new Uint8Array(buffer).set(range);
      return Promise.resolve(buffer);
    },
  });
}
