import { formatColor, parseColor } from "../color/color-utils";
import { stop } from "../utils/mapshaper-logging";
import utils from "../utils/mapshaper-utils";

export function blend(a, b) {
  var colors, weights, args;
  if (Array.isArray(a)) {
    colors = a;
    weights = b;
  } else {
    colors = [];
    weights = [];
    args = Array.from(arguments);
    for (var i = 0; i < args.length; i += 2) {
      colors.push(args[i]);
      weights.push(args[i + 1]);
    }
  }
  weights = normalizeWeights(weights);
  if (!weights) return "#eee";
  var blended = colors.reduce(
    (memo, col, i) => {
      var rgb = parseColor(col);
      var w = +weights[i] || 0;
      memo.r += rgb.r * w;
      memo.g += rgb.g * w;
      memo.b += rgb.b * w;
      return memo;
    },
    { r: 0, g: 0, b: 0 },
  );
  return formatColor(blended);
}

function normalizeWeights(weights) {
  var sum = utils.sum(weights);
  if (sum > 0 === false) {
    return null;
  }
  return weights.map((w) => w / sum);
}
