import { env } from "app/lib/env_client";
import { ROUTE_TYPE } from "state/mode";
import type { Feature, LineString, Position } from "types";

export type RoutingProviderId = "openrouteservice" | "geoapify" | "osrm";

type RoutingEnvironment = {
  provider?: string;
  apiKey?: string;
  url?: string;
  osrmDrivingUrl?: string;
  osrmWalkingUrl?: string;
  osrmCyclingUrl?: string;
};

export type RoutingResult = {
  attribution: string;
  geometry: LineString;
  provider: RoutingProviderId;
};

export type RoutingProvider = {
  attributionsHtml: string[];
  homepage: string;
  id: RoutingProviderId;
  name: string;
  profiles: ROUTE_TYPE[];
  route: (profile: ROUTE_TYPE, points: Position[]) => Promise<RoutingResult>;
};

const OSM_COPYRIGHT = "https://www.openstreetmap.org/copyright";

/**
 * Longer form here, but intentionally 'Data from OpenStreetMap' so this can be consolidated
 * with the OpenMapTiles / OpenFreeMap attribution. The AttributionControl eliminates
 * full substrings.
 */
const OSM_ATTRIBUTION = `Data from <a href="${OSM_COPYRIGHT}" target="_blank">OpenStreetMap</a>`;

const PROVIDERS = {
  openrouteservice: {
    attribution: `© openrouteservice.org by HeiGIT (CC BY 4.0) | Map data © OpenStreetMap contributors (${OSM_COPYRIGHT})`,
    attributionsHtml: [
      `© <a href="https://openrouteservice.org/terms-of-service/" target="_blank">openrouteservice.org</a> by HeiGIT`,
      OSM_ATTRIBUTION,
    ],
    homepage: "https://openrouteservice.org/",
    name: "openrouteservice",
  },
  geoapify: {
    attribution: `Powered by Geoapify (https://www.geoapify.com/) | © OpenStreetMap contributors (${OSM_COPYRIGHT})`,
    attributionsHtml: [
      `Powered by <a href="https://www.geoapify.com/" target="_blank">Geoapify</a>`,
      OSM_ATTRIBUTION,
    ],
    homepage: "https://www.geoapify.com/",
    name: "Geoapify",
  },
  osrm: {
    attribution: `Routing data © OpenStreetMap contributors (${OSM_COPYRIGHT})`,
    attributionsHtml: [
      `Routing data <a href="${OSM_COPYRIGHT}" target="_blank">© OpenStreetMap contributors</a>`,
    ],
    homepage: "https://project-osrm.org/",
    name: "OSRM",
  },
} as const;

const ALL_PROFILES = [
  ROUTE_TYPE.DRIVING,
  ROUTE_TYPE.WALKING,
  ROUTE_TYPE.CYCLING,
];

function asObject(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function errorMessage(value: unknown): string {
  const body = asObject(value);
  const message = body?.message ?? body?.error;
  return typeof message === "string" ? message : "Routing request failed";
}

async function responseJSON(response: Response): Promise<unknown> {
  const body = (await response.json()) as unknown;
  if (!response.ok) throw new Error(errorMessage(body));
  return body;
}

function isPosition(value: unknown): value is Position {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    value.every((coordinate) => typeof coordinate === "number")
  );
}

function isLineCoordinates(value: unknown): value is Position[] {
  return Array.isArray(value) && value.every(isPosition);
}

function routeGeometry(value: unknown): LineString {
  const geometry = asObject(value);
  if (
    geometry?.type === "LineString" &&
    isLineCoordinates(geometry.coordinates)
  ) {
    return { type: "LineString", coordinates: geometry.coordinates };
  }

  if (
    geometry?.type === "MultiLineString" &&
    Array.isArray(geometry.coordinates) &&
    geometry.coordinates.every(isLineCoordinates)
  ) {
    const coordinates: Position[] = [];
    for (const line of geometry.coordinates) {
      const first = line[0];
      const previous = coordinates.at(-1);
      const duplicate =
        previous &&
        first &&
        previous[0] === first[0] &&
        previous[1] === first[1];
      coordinates.push(...(duplicate ? line.slice(1) : line));
    }
    return { type: "LineString", coordinates };
  }

  throw new Error("Routing provider returned an invalid geometry");
}

function firstFeatureGeometry(body: unknown): unknown {
  const features = asObject(body)?.features;
  if (!Array.isArray(features) || !features.length) {
    throw new Error(errorMessage(body));
  }
  return asObject(features[0])?.geometry;
}

function firstOSRMGeometry(body: unknown): unknown {
  const routes = asObject(body)?.routes;
  if (!Array.isArray(routes) || !routes.length) {
    throw new Error(errorMessage(body));
  }
  return asObject(routes[0])?.geometry;
}

function result(provider: RoutingProviderId, geometry: unknown): RoutingResult {
  return {
    attribution: PROVIDERS[provider].attribution,
    geometry: routeGeometry(geometry),
    provider,
  };
}

function openRouteService(
  config: RoutingEnvironment,
  fetcher: typeof fetch,
): RoutingProvider | null {
  const defaultUrl = "https://api.openrouteservice.org/v2/directions";
  if (!config.apiKey && !config.url) return null;
  const url = (config.url || defaultUrl).replace(/\/+$/, "");
  const profileNames = {
    [ROUTE_TYPE.DRIVING]: "driving-car",
    [ROUTE_TYPE.WALKING]: "foot-walking",
    [ROUTE_TYPE.CYCLING]: "cycling-regular",
  };

  return {
    ...PROVIDERS.openrouteservice,
    id: "openrouteservice",
    profiles: ALL_PROFILES,
    async route(profile, points) {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (config.apiKey) headers.Authorization = config.apiKey;
      const response = await fetcher(
        `${url}/${profileNames[profile]}/geojson`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ coordinates: points }),
        },
      );
      const body = await responseJSON(response);
      return result("openrouteservice", firstFeatureGeometry(body));
    },
  };
}

function geoapify(
  config: RoutingEnvironment,
  fetcher: typeof fetch,
): RoutingProvider | null {
  const defaultUrl = "https://api.geoapify.com/v1/routing";
  if (!config.apiKey && !config.url) return null;
  const profileNames = {
    [ROUTE_TYPE.DRIVING]: "drive",
    [ROUTE_TYPE.WALKING]: "walk",
    [ROUTE_TYPE.CYCLING]: "bicycle",
  };

  return {
    ...PROVIDERS.geoapify,
    id: "geoapify",
    profiles: ALL_PROFILES,
    async route(profile, points) {
      const url = new URL(config.url || defaultUrl);
      url.searchParams.set(
        "waypoints",
        points.map(([lon, lat]) => `lonlat:${lon},${lat}`).join("|"),
      );
      url.searchParams.set("mode", profileNames[profile]);
      url.searchParams.set("format", "geojson");
      if (config.apiKey) url.searchParams.set("apiKey", config.apiKey);
      const body = await responseJSON(await fetcher(url));
      return result("geoapify", firstFeatureGeometry(body));
    },
  };
}

function osrm(
  config: RoutingEnvironment,
  fetcher: typeof fetch,
): RoutingProvider | null {
  const urls = new Map<ROUTE_TYPE, string>();
  if (config.osrmDrivingUrl) {
    urls.set(ROUTE_TYPE.DRIVING, config.osrmDrivingUrl);
  }
  if (config.osrmWalkingUrl) {
    urls.set(ROUTE_TYPE.WALKING, config.osrmWalkingUrl);
  }
  if (config.osrmCyclingUrl) {
    urls.set(ROUTE_TYPE.CYCLING, config.osrmCyclingUrl);
  }
  if (!urls.size) return null;

  return {
    ...PROVIDERS.osrm,
    id: "osrm",
    profiles: ALL_PROFILES.filter((profile) => urls.has(profile)),
    async route(profile, points) {
      const endpoint = urls.get(profile);
      if (!endpoint) throw new Error(`${profile} routing is not configured`);
      const coordinates = points.map((point) => point.join(",")).join(";");
      const url = new URL(`${endpoint.replace(/\/+$/, "")}/${coordinates}`);
      url.search = new URLSearchParams({
        alternatives: "false",
        geometries: "geojson",
        overview: "full",
        steps: "false",
      }).toString();
      const body = await responseJSON(await fetcher(url));
      return result("osrm", firstOSRMGeometry(body));
    },
  };
}

export function createRoutingProvider(
  config: RoutingEnvironment,
  fetcher: typeof fetch = fetch,
): RoutingProvider | null {
  switch (config.provider) {
    case "openrouteservice":
      return openRouteService(config, fetcher);
    case "geoapify":
      return geoapify(config, fetcher);
    case "osrm":
      return osrm(config, fetcher);
    default:
      return null;
  }
}

export function routeProperties(
  properties: Feature["properties"],
  route: RoutingResult,
): NonNullable<Feature["properties"]> {
  return {
    ...properties,
    "@routing:provider": route.provider,
    "@routing:attribution": route.attribution,
  };
}

export const routingProvider = createRoutingProvider({
  provider: env.ROUTING_PROVIDER,
  apiKey: env.ROUTING_API_KEY,
  url: env.ROUTING_URL,
  osrmDrivingUrl: env.OSRM_DRIVING_URL,
  osrmWalkingUrl: env.OSRM_WALKING_URL,
  osrmCyclingUrl: env.OSRM_CYCLING_URL,
});
