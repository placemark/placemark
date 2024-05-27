import { envsafe, str } from "envsafe";

export const env = envsafe({
  /**
   * Key for authenticating Mapbox maps.
   */
  NEXT_PUBLIC_MAPBOX_TOKEN: str({
    input: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
    devDefault: "_",
  }),
  /**
   * We use geocode.earth for geocoding:
   * https://geocode.earth/
   *
   * This is the token to authenticate with them.
   */
  NEXT_PUBLIC_GEOCODE_EARTH_TOKEN: str({
    input: process.env.NEXT_PUBLIC_GEOCODE_EARTH_TOKEN,
    default: "_",
  }),
});
