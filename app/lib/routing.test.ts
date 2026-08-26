import { ROUTE_TYPE } from "state/mode";
import { describe, expect, it, vi } from "vitest";
import { createRoutingProvider, routeProperties } from "./routing";

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("createRoutingProvider", () => {
  it("requires an explicit provider configuration", () => {
    expect(createRoutingProvider({})).toBeNull();
    expect(createRoutingProvider({ provider: "mapbox" })).toBeNull();
  });

  it("requests openrouteservice GeoJSON", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      response({
        features: [
          {
            geometry: {
              type: "LineString",
              coordinates: [
                [8.5, 47.3],
                [8.6, 47.4],
              ],
            },
          },
        ],
      }),
    );
    const provider = createRoutingProvider(
      { provider: "openrouteservice", apiKey: "test-key" },
      fetcher,
    );

    const route = await provider?.route(ROUTE_TYPE.WALKING, [
      [8.5, 47.3],
      [8.6, 47.4],
    ]);

    expect(fetcher).toHaveBeenCalledWith(
      "https://api.openrouteservice.org/v2/directions/foot-walking/geojson",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "test-key",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          coordinates: [
            [8.5, 47.3],
            [8.6, 47.4],
          ],
        }),
      }),
    );
    expect(route?.provider).toBe("openrouteservice");
    expect(route?.geometry.type).toBe("LineString");
  });

  it("requests Geoapify using longitude-latitude waypoints", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      response({
        features: [
          {
            geometry: {
              type: "MultiLineString",
              coordinates: [
                [
                  [8.5, 47.3],
                  [8.55, 47.35],
                ],
                [
                  [8.55, 47.35],
                  [8.6, 47.4],
                ],
              ],
            },
          },
        ],
      }),
    );
    const provider = createRoutingProvider(
      { provider: "geoapify", apiKey: "test-key" },
      fetcher,
    );

    const route = await provider?.route(ROUTE_TYPE.CYCLING, [
      [8.5, 47.3],
      [8.6, 47.4],
    ]);
    const request = fetcher.mock.calls[0]?.[0];
    expect(request).toBeInstanceOf(URL);
    if (!(request instanceof URL)) throw new Error("Expected a URL request");
    const requestedUrl = request;

    expect(requestedUrl.origin + requestedUrl.pathname).toBe(
      "https://api.geoapify.com/v1/routing",
    );
    expect(requestedUrl.searchParams.get("waypoints")).toBe(
      "lonlat:8.5,47.3|lonlat:8.6,47.4",
    );
    expect(requestedUrl.searchParams.get("mode")).toBe("bicycle");
    expect(requestedUrl.searchParams.get("apiKey")).toBe("test-key");
    expect(route?.geometry.coordinates).toEqual([
      [8.5, 47.3],
      [8.55, 47.35],
      [8.6, 47.4],
    ]);
  });

  it("only enables configured OSRM profiles", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      response({
        routes: [
          {
            geometry: {
              type: "LineString",
              coordinates: [
                [8.5, 47.3],
                [8.6, 47.4],
              ],
            },
          },
        ],
      }),
    );
    const provider = createRoutingProvider(
      {
        provider: "osrm",
        osrmDrivingUrl: "https://router.example/route/v1/driving/",
      },
      fetcher,
    );

    expect(provider?.profiles).toEqual([ROUTE_TYPE.DRIVING]);
    await provider?.route(ROUTE_TYPE.DRIVING, [
      [8.5, 47.3],
      [8.6, 47.4],
    ]);
    const request = fetcher.mock.calls[0]?.[0];
    expect(request).toBeInstanceOf(URL);
    if (!(request instanceof URL)) throw new Error("Expected a URL request");
    const requestedUrl = request;
    expect(requestedUrl.origin + requestedUrl.pathname).toBe(
      "https://router.example/route/v1/driving/8.5,47.3;8.6,47.4",
    );
    expect(requestedUrl.searchParams.get("geometries")).toBe("geojson");
  });
});

it("stores routing provenance without removing route properties", () => {
  expect(
    routeProperties(
      { "@type": "route:walking", name: "Test route" },
      {
        provider: "openrouteservice",
        attribution: "Routing attribution",
        geometry: { type: "LineString", coordinates: [] },
      },
    ),
  ).toEqual({
    "@type": "route:walking",
    name: "Test route",
    "@routing:provider": "openrouteservice",
    "@routing:attribution": "Routing attribution",
  });
});
