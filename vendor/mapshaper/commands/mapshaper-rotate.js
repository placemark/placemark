import { cleanProjectedLayers } from "../commands/mapshaper-proj";
import {
  densifyAntimeridianSegment,
  densifyDataset,
  densifyPathByInterval,
  getIntervalInterpolator,
} from "../crs/mapshaper-densify";
import { getDatasetCRS, isLatLngCRS } from "../crs/mapshaper-projections";
import {
  getRotationFunction2,
  rotateDatasetCoords,
} from "../crs/mapshaper-spherical-rotation";
import { DatasetEditor } from "../dataset/mapshaper-dataset-editor";
import {
  removeCutSegments,
  removePolygonCrosses,
  removePolylineCrosses,
  segmentCrossesAntimeridian,
} from "../geom/mapshaper-antimeridian-cuts";
import {
  getPlanarPathArea,
  getSphericalPathArea,
} from "../geom/mapshaper-polygon-geom";
import cmd from "../mapshaper-cmd";
import {
  isClosedPath,
  isEdgeSegment,
  isWholeWorld,
  lastEl,
  onPole,
  samePoint,
  snapToEdge,
} from "../paths/mapshaper-coordinate-utils";
import { buildTopology } from "../topology/mapshaper-topology";
import { debug, error, stop } from "../utils/mapshaper-logging";

cmd.rotate = rotateDataset;

export function rotateDataset(dataset, opts) {
  if (!isLatLngCRS(getDatasetCRS(dataset))) {
    stop("Command requires a lat-long dataset.");
  }
  if (!Array.isArray(opts.rotation) || !opts.rotation.length) {
    stop("Invalid rotation parameter");
  }
  var rotatePoint = getRotationFunction2(opts.rotation, opts.invert);
  var editor = new DatasetEditor(dataset);
  if (dataset.arcs) {
    dataset.arcs.flatten();
  }

  dataset.layers.forEach((lyr) => {
    var type = lyr.geometry_type;
    editor.editLayer(lyr, getGeometryRotator(type, rotatePoint, opts));
  });
  editor.done();
  if (!opts.debug) {
    buildTopology(dataset);
    cleanProjectedLayers(dataset);
  }
}

function getGeometryRotator(layerType, rotatePoint, opts) {
  var rings;
  if (layerType == "point") {
    return (coords) => {
      coords.forEach(rotatePoint);
      return coords;
    };
  }
  if (layerType == "polyline") {
    return (coords) => {
      coords = densifyPathByInterval(coords, 0.5);
      coords.forEach(rotatePoint);
      return removePolylineCrosses(coords);
    };
  }
  if (layerType == "polygon") {
    return (coords, i, shape) => {
      if (isWholeWorld(coords)) {
        coords = densifyPathByInterval(coords, 0.5);
      } else {
        coords.forEach(snapToEdge);
        coords = removeCutSegments(coords);
        coords = densifyPathByInterval(coords, 0.5, getInterpolator(0.5));
        coords.forEach(rotatePoint);
        // coords.forEach(snapToEdge);
      }
      if (i === 0) {
        // first part
        rings = [];
      }
      if (coords.length < 4) {
        debug("Short ring", coords);
        return;
      }
      if (!samePoint(coords[0], lastEl(coords))) {
        error("Open polygon ring");
      }
      rings.push(coords); // accumulate rings
      if (i == shape.length - 1) {
        // last part
        return opts.debug ? rings : removePolygonCrosses(rings);
      }
    };
  }
  return null; // assume layer has no geometry -- callback should not be called
}

function getInterpolator(interval) {
  var interpolate = getIntervalInterpolator(interval);
  return (a, b) => {
    var points;
    if (onPole(a) || onPole(b)) {
      points = [];
    } else if (isEdgeSegment(a, b)) {
      points = densifyAntimeridianSegment(a, b, interval);
    } else if (segmentCrossesAntimeridian(a, b)) {
      // TODO: interpolate up to antimeridian?
      points = [];
    } else {
      points = interpolate(a, b);
    }
    return points;
  };
}
