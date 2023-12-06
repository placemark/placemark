import { importGeoJSON } from "../geojson/geojson-import";
import cmd from "../mapshaper-cmd";
import { stop } from "../utils/mapshaper-logging";
import { isLatLngDataset } from "../crs/mapshaper-projections";
import {
  requirePointLayer,
  getLayerBounds,
  countMultiPartFeatures,
  setOutputLayerName,
} from "../dataset/mapshaper-layer-utils";
import { getDatasetBounds } from "../dataset/mapshaper-dataset-utils";
import {
  forEachPoint,
  getPointsInLayer,
} from "../points/mapshaper-point-utils";
import { mergeDatasets } from "../dataset/mapshaper-merging";
import { greatCircleDistance, distance2D } from "../geom/mapshaper-basic-geom";
import { buildTopology } from "../topology/mapshaper-topology";
import { cleanLayers } from "../commands/mapshaper-clean";
import { getPlanarSegmentEndpoint } from "../geom/mapshaper-geodesic";
import { getPointBufferCoordinates } from "../buffer/mapshaper-point-buffer";
import { IdTestIndex } from "../indexing/mapshaper-id-test-index";
import { getJoinCalc } from "../join/mapshaper-join-calc";
import Flatbush from "flatbush";

cmd.pointToGrid = function (targetLayers, targetDataset, opts) {
  targetLayers.forEach(requirePointLayer);
  if (opts.interval > 0 === false) {
    stop("Expected a non-negative interval parameter");
  }
  if (opts.radius > 0 === false) {
    stop("Expected a non-negative radius parameter");
  }
  // var bbox = getLayerBounds(pointLyr).toArray();
  // Use target dataset, so grids are aligned between layers
  // TODO: align grids between datasets
  var bbox = getDatasetBounds(targetDataset).toArray();

  var datasets = [targetDataset];
  var outputLayers = targetLayers.map(function (pointLyr) {
    if (countMultiPartFeatures(pointLyr) > 0) {
      stop("This command requires single points");
    }
    var dataset = getPolygonDataset(pointLyr, bbox, opts);
    var gridLyr = dataset.layers[0];
    datasets.push(dataset);
    setOutputLayerName(gridLyr, pointLyr, "grid", opts);
    return gridLyr;
  });

  var merged = mergeDatasets(datasets);
  // build topology for the entire dataset, in case the command is used on
  // multiple target layers.
  buildTopology(merged);
  targetDataset.arcs = merged.arcs;
  return outputLayers;
};

function getPolygonDataset(pointLyr, gridBBox, opts) {
  var interval = opts.interval;
  var points = getPointsInLayer(pointLyr);
  var grid = getGridData(gridBBox, interval);
  var lookup = getPointIndex(points, grid, opts.radius);
  var n = grid.cells();
  var geojson = {
    type: "FeatureCollection",
    features: [],
  };
  var calc = null;
  var cands, center, weight, d;
  if (opts.calc) {
    calc = getJoinCalc(pointLyr.data, opts.calc);
  }

  for (var i = 0; i < n; i++) {
    cands = lookup(i);
    if (!cands.length) continue;
    center = grid.idxToPoint(i);
    d = calcCellProperties(center, cands, points, calc, opts);
    // weight = calcCellWeight(center, cands, points, opts);
    if (d.weight > 0.05 === false) continue;
    d.id = i;
    geojson.features.push({
      type: "Feature",
      properties: d,
      geometry: makeCellPolygon(i, grid, opts),
    });
  }
  var dataset = importGeoJSON(geojson, {});
  return dataset;
}

function calcCellProperties(center, cands, points, calc, opts) {
  // radius of circle with same area as the cell
  var interval = opts.interval;
  var radius = interval * Math.sqrt(1 / Math.PI);
  var circleArea = Math.PI * opts.radius * opts.radius;
  var cellArea = interval * interval;
  var ids = [];
  var totArea = 0;
  var intersection;
  for (var i = 0; i < cands.length; i++) {
    intersection = twoCircleIntersection(
      center,
      radius,
      points[cands[i]],
      opts.radius
    );
    if (intersection > 0 === false) continue;
    totArea += intersection;
    ids.push(cands[i]);
  }
  var d = { weight: totArea / cellArea };
  if (calc) {
    calc(ids, d);
  }
  return d;
}

// function calcCellWeight(center, ids, points, opts) {
//   // radius of circle with same area as the cell
//   var interval = opts.interval;
//   var radius = interval * Math.sqrt(1 / Math.PI);
//   var circleArea = Math.PI * opts.radius * opts.radius;
//   var cellArea = interval * interval;
//   var totArea = 0;
//   for (var i=0; i<ids.length; i++) {
//     totArea += twoCircleIntersection(center, radius, points[ids[i]], opts.radius);
//   }
//   return totArea / cellArea;
// }

// Source: https://diego.assencio.com/?index=8d6ca3d82151bad815f78addf9b5c1c6
export function twoCircleIntersection(c1, r1, c2, r2) {
  var d = distance2D(c1[0], c1[1], c2[0], c2[1]);
  if (d >= r1 + r2) return 0;
  var r1sq = r1 * r1,
    r2sq = r2 * r2,
    d1 = (r1sq - r2sq + d * d) / (2 * d),
    d2 = d - d1;
  if (d <= Math.abs(r1 - r2)) {
    return Math.PI * Math.min(r1sq, r2sq);
  }
  return (
    r1sq * Math.acos(d1 / r1) -
    d1 * Math.sqrt(r1sq - d1 * d1) +
    r2sq * Math.acos(d2 / r2) -
    d2 * Math.sqrt(r2sq - d2 * d2)
  );
}

function makeCellPolygon(idx, grid, opts) {
  var coords = opts.circles
    ? makeCircleCoords(grid.idxToPoint(idx), opts)
    : makeCellCoords(grid.idxToBBox(idx), opts);
  return {
    type: "Polygon",
    coordinates: [coords],
  };
}

function makeCellCoords(bbox, opts) {
  var margin = opts.interval * (opts.cell_margin || 0);
  var a = bbox[0] + margin,
    b = bbox[1] + margin,
    c = bbox[2] - margin,
    d = bbox[3] - margin;
  return [
    [a, b],
    [a, d],
    [c, d],
    [c, b],
    [a, b],
  ];
}

function makeCircleCoords(center, opts) {
  var margin = opts.cell_margin > 0 ? opts.cell_margin : 1e-6;
  var radius = (opts.interval / 2) * (1 - margin);
  return getPointBufferCoordinates(
    center,
    radius,
    20,
    getPlanarSegmentEndpoint
  );
}

function getPointIndex(points, grid, radius) {
  var gridIndex = new IdTestIndex(grid.cells());
  var bboxIndex = new Flatbush(points.length);
  var empty = [];
  points.forEach(function (p) {
    addPointToGridIndex(p, gridIndex, grid);
    bboxIndex.add.apply(bboxIndex, getPointBounds(p, radius));
  });
  bboxIndex.finish();
  return function (i) {
    if (!gridIndex.hasId(i)) return empty;
    var bbox = grid.idxToBBox(i);
    return bboxIndex.search.apply(bboxIndex, bbox);
  };
}

function addPointToGridIndex(p, index, grid) {
  var i = grid.pointToIdx(p);
  var c = grid.idxToCol(i);
  var r = grid.idxToRow(i);
  addCellToGridIndex(c + 1, r + 1, grid, index);
  addCellToGridIndex(c + 1, r, grid, index);
  addCellToGridIndex(c + 1, r - 1, grid, index);
  addCellToGridIndex(c, r + 1, grid, index);
  addCellToGridIndex(c, r, grid, index);
  addCellToGridIndex(c, r - 1, grid, index);
  addCellToGridIndex(c - 1, r + 1, grid, index);
  addCellToGridIndex(c - 1, r, grid, index);
  addCellToGridIndex(c - 1, r - 1, grid, index);
}

function addCellToGridIndex(c, r, grid, index) {
  var i = grid.colRowToIdx(c, r);
  if (i > -1) index.setId(i);
}

// TODO: support spherical coords
function getPointBounds(p, radius) {
  return [p[0] - radius, p[1] - radius, p[0] + radius, p[1] + radius];
}

function getGridInterpolator(bbox, interval) {
  var sparseArr = [];
  var grid = getGridData(bbox, interval);
}

// TODO: put this in a separate file, use it for other grid-based commands
// like -dots
function getGridData(bbox, interval) {
  var xmin = bbox[0] - interval;
  var ymin = bbox[1] - interval;
  var xmax = bbox[2] + interval;
  var ymax = bbox[3] + interval;
  var w = xmax - xmin;
  var h = ymax - ymin;
  var cols = Math.ceil(w / interval);
  var rows = Math.ceil(h / interval);
  function size() {
    return [cols, rows];
  }
  function cells() {
    return cols * rows;
  }
  function pointToCol(xy) {
    var dx = xy[0] - xmin;
    return Math.floor((dx / w) * cols);
  }
  function pointToRow(xy) {
    var dy = xy[1] - ymin;
    return Math.floor((dy / h) * rows);
  }
  function colRowToIdx(c, r) {
    if (c < 0 || r < 0 || c >= cols || r >= rows) return -1;
    return r * cols + c;
  }
  function pointToIdx(xy) {
    var c = pointToCol(xy);
    var r = pointToRow(xy);
    return colRowToIdx(c, r);
  }
  function idxToCol(i) {
    return i % cols;
  }
  function idxToRow(i) {
    return Math.floor(i / cols);
  }
  function idxToPoint(idx) {
    var x = xmin + (idxToCol(idx) + 0.5) * interval;
    var y = ymin + (idxToRow(idx) + 0.5) * interval;
    return [x, y];
  }
  function idxToBBox(idx) {
    var c = idxToCol(idx);
    var r = idxToRow(idx);
    return [
      xmin + c * interval,
      ymin + r * interval,
      xmin + (c + 1) * interval,
      ymin + (r + 1) * interval,
    ];
  }
  return {
    size,
    cells,
    pointToCol,
    pointToRow,
    colRowToIdx,
    pointToIdx,
    idxToCol,
    idxToRow,
    idxToBBox,
    idxToPoint,
  };
}
