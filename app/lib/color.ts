import randomColor from "randomcolor";
import type { IPresence, RampValues } from "types";

export function colorFromPresence(presence: IPresence) {
  return randomColor({ seed: presence.userId * 10, luminosity: "dark" });
}

/**
 * Generate a CSS linear gradient from a list of colors
 */
export function linearGradient({
  colors,
  interpolate,
}: { colors: string[] } & Pick<RampValues, "interpolate">) {
  const percent = 100 / colors.length;
  const steps = colors.map((color, i) =>
    interpolate === "step"
      ? `${color} ${percent * i}%, ${color} ${percent * (i + 1)}%`
      : `${color} ${percent * i}%`,
  );
  return `linear-gradient(90deg, ${steps.join(",")}`;
}
