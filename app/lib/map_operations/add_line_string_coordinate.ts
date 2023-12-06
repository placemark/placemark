import type { IFeature, Position, LineString, Feature } from "types";
import replaceCoordinates from "app/lib/replace_coordinates";

export function addLineStringCoordinate(
  feature: Feature,
  {
    position,
    reverse,
  }: {
    position: Position;
    reverse: boolean;
  }
): Feature {
  const { geometry } = feature;
  if (geometry?.type !== "LineString") return feature;
  return replaceCoordinates(
    feature as IFeature<LineString>,
    reverse
      ? [position].concat(geometry.coordinates)
      : geometry.coordinates.concat([position])
  );
}
