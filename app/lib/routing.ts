import type { ROUTE_TYPE } from "state/mode";
import type { Position } from "types";

export function getRoutingURL(
  endpoint: string,
  routeType: ROUTE_TYPE,
  points: Position[],
): string {
  const coordinates = points.map((point) => point.join(",")).join(";");
  const url = new URL(
    `${endpoint.replace(/\/+$/, "")}/${routeType}/${coordinates}`,
  );
  url.search = new URLSearchParams({
    alternatives: "false",
    geometries: "geojson",
    overview: "full",
    steps: "false",
  }).toString();
  return url.toString();
}
