import { convex } from "vendor/concaveman";
import type { Feature } from "types";

export const makeConvexHull = (features: Feature[]) => {
  const hull = convex({
    type: "FeatureCollection",
    features: features,
  });

  return hull;
};
