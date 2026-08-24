import { ROUTE_TYPE } from "state/mode";
import { describe, expect, it } from "vitest";
import { getRoutingURL } from "./routing";

describe("getRoutingURL", () => {
  it("builds an OSRM route request", () => {
    expect(
      getRoutingURL("https://router.example/route/v1/", ROUTE_TYPE.WALKING, [
        [8.5, 47.3],
        [8.6, 47.4],
      ]),
    ).toBe(
      "https://router.example/route/v1/walking/8.5,47.3;8.6,47.4?alternatives=false&geometries=geojson&overview=full&steps=false",
    );
  });
});
