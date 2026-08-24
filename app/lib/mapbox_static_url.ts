import { targetSize } from "./constants";

export type PreviewLayer =
  | { type: "MAPBOX"; url: string; token: string }
  | {
      type: "STYLE" | "XYZ" | "TILEJSON";
      url: string;
      token?: string;
    };

/**
 * Given a layer, return a raw URL for its preview.
 *
 * @returns Raw URL pointing to an image for this layer's preview
 */
export function mapboxStaticURL(mapboxLayer: PreviewLayer) {
  switch (mapboxLayer.type) {
    case "MAPBOX": {
      const params = new URLSearchParams({
        access_token: mapboxLayer.token,
        attribution: "false",
        logo: "false",
      }).toString();
      const u = new URL(mapboxLayer.url);
      const p = u.pathname.replace("//styles", "");
      return `https://api.mapbox.com/styles/v1${p}/static/[-136.3106,-35.8527,-22.7311,59.8357]/${targetSize.join(
        "x",
      )}@2x?${params}`;
    }
    case "XYZ": {
      return mapboxLayer.url
        .replace("{x}", "0")
        .replace("{y}", "0")
        .replace("{z}", "0");
    }
    case "TILEJSON": {
      // TODO: tilejson previews are… harder
      return mapboxLayer.url
        .replace("{x}", "0")
        .replace("{y}", "0")
        .replace("{z}", "0");
    }
    case "STYLE": {
      return undefined;
    }
  }
}
