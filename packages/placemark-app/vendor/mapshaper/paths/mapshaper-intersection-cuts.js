import {
  getHighPrecisionSnapInterval,
  snapCoordsByInterval,
} from "../paths/mapshaper-snapping";
import { convertIntervalParam } from "../geom/mapshaper-units";
import { debug, error } from "../utils/mapshaper-logging";
import { NodeCollection } from "../topology/mapshaper-nodes";
import { getDatasetCRS } from "../crs/mapshaper-projections";
import {
  layerHasPaths,
  getArcPresenceTest2,
} from "../dataset/mapshaper-layer-utils";
import { cleanShapes } from "../paths/mapshaper-path-repair-utils";
import { buildTopology } from "../topology/mapshaper-topology";
import { absArcId } from "../paths/mapshaper-arc-utils";
import { editShapes } from "../paths/mapshaper-shape-utils";
import { findSegmentIntersections } from "../paths/mapshaper-segment-intersection";
import geom from "../geom/mapshaper-geom";

// Functions for dividing polygons and polygons at points where arc-segments intersect

// TODO:
//    Consider inserting cut points on import, when building initial topology
//    Improve efficiency (e.g. only update ArcCollection once)
//    Remove junk arcs (collapsed and duplicate arcs) instead of just removing
//       references to them

// Divide a collection of arcs at points where segments intersect
// and re-index the paths of all the layers that reference the arc collection.
// (in-place)
export function addIntersectionCuts(dataset, _opts) {
  var opts = _opts || {};
  var arcs = dataset.arcs;
  var arcBounds = arcs && arcs.getBounds();
  var snapDist, nodes;
  if (!arcBounds || !arcBounds.hasBounds()) {
    return new NodeCollection([]);
  }

  if (opts.snap_interval) {
    snapDist = convertIntervalParam(opts.snap_interval, getDatasetCRS(dataset));
  } else if (!opts.no_snap && arcBounds.hasBounds()) {
    snapDist = getHighPrecisionSnapInterval(arcBounds.toArray());
  } else {
    snapDist = 0;
  }
  debug("addIntersectionCuts() snap dist:", snapDist);

  // bake-in any simplification (bug fix; before, -simplify followed by dissolve2
  // used to reset simplification)
  arcs.flatten();

  var changed = snapAndCut(dataset, snapDist);
  // Detect topology again if coordinates have changed
  if (changed || opts.rebuild_topology) {
    buildTopology(dataset);
  }

  // Clean shapes by removing collapsed arc references, etc.
  // TODO: consider alternative -- avoid creating degenerate arcs
  // in insertCutPoints()
  dataset.layers.forEach(function (lyr) {
    if (layerHasPaths(lyr)) {
      cleanShapes(lyr.shapes, arcs, lyr.geometry_type);
    }
  });

  // Further clean-up -- remove duplicate and missing arcs
  nodes = cleanArcReferences(dataset);
  return nodes;
}

function snapAndCut(dataset, snapDist) {
  var arcs = dataset.arcs;
  var cutOpts = snapDist > 0 ? {} : { tolerance: 0 };
  var coordsHaveChanged = false;
  var snapCount, dupeCount, cutCount;
  snapCount = snapCoordsByInterval(arcs, snapDist);
  dupeCount = arcs.dedupCoords();

  // why was topology built here previously????
  // if (snapCount > 0 || dupeCount > 0) {
  //   // Detect topology again if coordinates have changed
  //   internal.buildTopology(dataset);
  // }

  // cut arcs at points where segments intersect
  cutCount = cutPathsAtIntersections(dataset, cutOpts);
  if (cutCount > 0 || snapCount > 0 || dupeCount > 0) {
    coordsHaveChanged = true;
  }
  // perform a second snap + cut pass if needed
  if (cutCount > 0) {
    cutCount = 0;
    snapCount = snapCoordsByInterval(arcs, snapDist);
    arcs.dedupCoords(); // need to do this here?
    if (snapCount > 0) {
      cutCount = cutPathsAtIntersections(dataset, cutOpts);
    }
    if (cutCount > 0) {
      arcs.dedupCoords(); // need to do this here?
      debug("Second-pass vertices added:", cutCount, "consider third pass?");
    }
  }
  return coordsHaveChanged;
}

// Remap any references to duplicate arcs in paths to use the same arcs
// Remove any unused arcs from the dataset's ArcCollection.
// Return a NodeCollection
function cleanArcReferences(dataset) {
  var nodes = new NodeCollection(dataset.arcs);
  var map = findDuplicateArcs(nodes);
  var dropCount;
  if (map) {
    replaceIndexedArcIds(dataset, map);
  }
  dropCount = deleteUnusedArcs(dataset);
  if (dropCount > 0) {
    // rebuild nodes if arcs have changed
    nodes = new NodeCollection(dataset.arcs);
  }
  return nodes;
}

// @map an Object mapping old to new ids
function replaceIndexedArcIds(dataset, map) {
  var remapPath = function (ids) {
    var arcId, absId, id2;
    for (var i = 0; i < ids.length; i++) {
      arcId = ids[i];
      absId = absArcId(arcId);
      id2 = map[absId];
      ids[i] = arcId == absId ? id2 : ~id2;
    }
    return ids;
  };
  dataset.layers.forEach(function (lyr) {
    if (layerHasPaths(lyr)) {
      editShapes(lyr.shapes, remapPath);
    }
  });
}

function findDuplicateArcs(nodes) {
  var map = new Int32Array(nodes.arcs.size()),
    count = 0,
    i2;
  for (var i = 0, n = nodes.arcs.size(); i < n; i++) {
    i2 = nodes.findDuplicateArc(i);
    map[i] = i2;
    if (i != i2) count++;
  }
  return count > 0 ? map : null;
}

function deleteUnusedArcs(dataset) {
  var test = getArcPresenceTest2(dataset.layers, dataset.arcs);
  var count1 = dataset.arcs.size();
  var map = dataset.arcs.deleteArcs(test); // condenses arcs
  var count2 = dataset.arcs.size();
  var deleteCount = count1 - count2;
  if (deleteCount > 0) {
    replaceIndexedArcIds(dataset, map);
  }
  return deleteCount;
}

// Return a function for updating a path (array of arc ids)
// @map array generated by insertCutPoints()
// @arcCount number of arcs in divided collection (kludge)
function getDividedArcUpdater(map, arcCount) {
  return function (ids) {
    var ids2 = [];
    for (var j = 0; j < ids.length; j++) {
      remapArcId2(ids[j], ids2);
    }
    return ids2;
  };

  function remapArcId2(id, ids) {
    var rev = id < 0,
      absId = rev ? ~id : id,
      min = map[absId],
      max = (absId >= map.length - 1 ? arcCount : map[absId + 1]) - 1,
      id2;
    do {
      if (rev) {
        id2 = ~max;
        max--;
      } else {
        id2 = min;
        min++;
      }
      ids.push(id2);
    } while (max - min >= 0);
  }
}

// Divides a collection of arcs at points where arc paths cross each other
// Returns array for remapping arc ids
export function divideArcs(arcs, opts) {
  var points = findClippingPoints(arcs, opts);
  // TODO: avoid the following if no points need to be added
  var map = insertCutPoints(points, arcs);
  // segment-point intersections currently create duplicate points
  // TODO: consider dedup in a later cleanup pass?
  // arcs.dedupCoords();
  return map;
}

export function cutPathsAtIntersections(dataset, opts) {
  var n = dataset.arcs.getPointCount();
  var map = divideArcs(dataset.arcs, opts);
  var n2 = dataset.arcs.getPointCount();
  remapDividedArcs(dataset, map);
  return n2 - n;
}

export function remapDividedArcs(dataset, map) {
  var remapPath = getDividedArcUpdater(map, dataset.arcs.size());
  dataset.layers.forEach(function (lyr) {
    if (layerHasPaths(lyr)) {
      editShapes(lyr.shapes, remapPath);
    }
  });
}

// Inserts array of cutting points into an ArcCollection
// Returns array for remapping arc ids
export function insertCutPoints(unfilteredPoints, arcs) {
  var data = arcs.getVertexData(),
    xx0 = data.xx,
    yy0 = data.yy,
    nn0 = data.nn,
    i0 = 0,
    i1 = 0,
    nn1 = [],
    srcArcTotal = arcs.size(),
    map = new Uint32Array(srcArcTotal),
    points = filterSortedCutPoints(
      sortCutPoints(unfilteredPoints, xx0, yy0),
      arcs
    ),
    destPointTotal = arcs.getPointCount() + points.length * 2,
    xx1 = new Float64Array(destPointTotal),
    yy1 = new Float64Array(destPointTotal),
    n0,
    n1,
    arcLen,
    p;

  points.reverse(); // reverse sorted order to use pop()
  p = points.pop();

  for (var srcArcId = 0, destArcId = 0; srcArcId < srcArcTotal; srcArcId++) {
    // start merging an arc
    arcLen = nn0[srcArcId];
    map[srcArcId] = destArcId;
    n0 = 0;
    n1 = 0;
    while (n0 < arcLen) {
      // copy another point
      xx1[i1] = xx0[i0];
      yy1[i1] = yy0[i0];
      i1++;
      n1++;
      while (p && p.i == i0) {
        // interpolate any clip points that fall within the current segment
        xx1[i1] = p.x;
        yy1[i1] = p.y;
        i1++;
        n1++;
        nn1[destArcId++] = n1; // end current arc at intersection
        n1 = 0; // begin new arc
        xx1[i1] = p.x;
        yy1[i1] = p.y;
        i1++;
        n1++;
        p = points.pop();
      }
      n0++;
      i0++;
    }
    nn1[destArcId++] = n1;
  }

  if (i1 != destPointTotal) error("[insertCutPoints()] Counting error");
  arcs.updateVertexData(nn1, xx1, yy1, null);
  return map;
}

function convertIntersectionsToCutPoints(intersections, xx, yy) {
  var points = [],
    ix,
    a,
    b;
  for (var i = 0, n = intersections.length; i < n; i++) {
    ix = intersections[i];
    a = getCutPoint(ix.x, ix.y, ix.a[0], ix.a[1], xx, yy);
    b = getCutPoint(ix.x, ix.y, ix.b[0], ix.b[1], xx, yy);
    if (a) points.push(a);
    if (b) points.push(b);
  }
  return points;
}

// i, j: indexes of segment endpoints in xx, yy, or of a single endpoint
//   if point x,y falls on an endpoint
// Assumes: i <= j
export function getCutPoint(x, y, i, j, xx, yy) {
  var ix = xx[i],
    iy = yy[i],
    jx = xx[j],
    jy = yy[j];
  if (j < i || j > i + 1) {
    error("Out-of-sequence arc ids:", i, j);
  }

  // Removed out-of-range check: small out-of-range intersection points are now allowed.
  // (Such points may occur due to fp rounding, when intersections occur along
  // vertical or horizontal segments)
  // if (geom.outsideRange(x, ix, jx) || geom.outsideRange(y, iy, jy)) {
  // return null;
  // }

  // Removed endpoint check: intersecting arcs need to be cut both at vertices
  // and between vertices, so pathfinding functions will work correctly.
  // if (x == ix && y == iy || x == jx && y == jy) {
  // return null;
  // }
  return { x: x, y: y, i: i };
}

// Sort insertion points in order of insertion
// Insertion order: ascending id of first endpoint of containing segment and
//   ascending distance from same endpoint.
export function sortCutPoints(points, xx, yy) {
  points.sort(function (a, b) {
    if (a.i != b.i) return a.i - b.i;
    return (
      geom.distanceSq(xx[a.i], yy[a.i], a.x, a.y) -
      geom.distanceSq(xx[b.i], yy[b.i], b.x, b.y)
    );
    // The old code below is no longer reliable, now that out-of-range intersection
    // points are allowed.
    // return Math.abs(a.x - xx[a.i]) - Math.abs(b.x - xx[b.i]) ||
    // Math.abs(a.y - yy[a.i]) - Math.abs(b.y - yy[b.i]);
  });
  return points;
}

// Removes duplicate points and arc endpoints
export function filterSortedCutPoints(points, arcs) {
  var filtered = [],
    pointId = 0;
  arcs.forEach2(function (i, n, xx, yy) {
    var j = i + n - 1,
      x0 = xx[i],
      y0 = yy[i],
      xn = xx[j],
      yn = yy[j],
      p,
      pp;

    while (pointId < points.length && points[pointId].i <= j) {
      p = points[pointId];
      pp = filtered[filtered.length - 1]; // previous point
      if ((p.x == x0 && p.y == y0) || (p.x == xn && p.y == yn)) {
        // clip point is an arc endpoint -- discard
      } else if (pp && pp.x == p.x && pp.y == p.y && pp.i == p.i) {
        // clip point is a duplicate -- discard
      } else {
        filtered.push(p);
      }
      pointId++;
    }
  });
  return filtered;
}

export function findClippingPoints(arcs, opts) {
  var intersections = findSegmentIntersections(arcs, opts),
    data = arcs.getVertexData();
  return convertIntersectionsToCutPoints(intersections, data.xx, data.yy);
}
