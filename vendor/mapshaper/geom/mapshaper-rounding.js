import { transformPoints } from "../dataset/mapshaper-dataset-utils";
import { forEachPoint } from "../points/mapshaper-point-utils";
import { error } from "../utils/mapshaper-logging";
import utils from "../utils/mapshaper-utils";

export function roundToSignificantDigits(n, d) {
  return +n.toPrecision(d);
}

function roundToDigits(n, d) {
  return +n.toFixed(d); // string conversion makes this slow
}

export function roundToTenths(n) {
  return Math.round(n * 10) / 10;
}

// inc: Rounding increment (e.g. 0.001 rounds to thousandths)
export function getRoundingFunction(inc) {
  if (!utils.isNumber(inc) || inc === 0) {
    error("Rounding increment must be a non-zero number.");
  }
  var inv = 1 / inc;
  if (inv > 1) inv = Math.round(inv);
  return (x) => Math.round(x * inv) / inv;
}

export function getBoundsPrecisionForDisplay(bbox) {
  var w = bbox[2] - bbox[0],
    h = bbox[3] - bbox[1],
    range = Math.min(w, h) + 1e-8,
    digits = 0;
  while (range < 2000) {
    range *= 10;
    digits++;
  }
  return digits;
}

function getRoundedCoordString(coords, decimals) {
  return coords.map((n) => n.toFixed(decimals)).join(",");
}

function getRoundedCoords(coords, decimals) {
  return getRoundedCoordString(coords, decimals).split(",").map(parseFloat);
}

function roundPoints(lyr, round) {
  forEachPoint(lyr.shapes, (p) => {
    p[0] = round(p[0]);
    p[1] = round(p[1]);
  });
}

export function setCoordinatePrecision(dataset, precision) {
  var round = getRoundingFunction(precision);
  // var dissolvePolygon, nodes;
  transformPoints(dataset, (x, y) => [round(x), round(y)]);
  // v0.4.52 removing polygon dissolve - see issue #219
  /*
  if (dataset.arcs) {
    nodes = internal.addIntersectionCuts(dataset);
    dissolvePolygon = internal.getPolygonDissolver(nodes);
  }
  dataset.layers.forEach(function(lyr) {
    if (lyr.geometry_type == 'polygon' && dissolvePolygon) {
      // clean each polygon -- use dissolve function to remove spikes
      // TODO: better handling of corrupted polygons
      lyr.shapes = lyr.shapes.map(dissolvePolygon);
    }
  });
  */
  return dataset;
}
