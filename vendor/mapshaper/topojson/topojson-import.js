import {
  divideFeaturesByType,
  layerHasPaths,
  layerHasPoints,
} from "../dataset/mapshaper-layer-utils";
import { importMetadata } from "../dataset/mapshaper-metadata";
import { DataTable } from "../datatable/mapshaper-data-table";
import { fixInconsistentFields } from "../datatable/mapshaper-data-utils";
import GeoJSON from "../geojson/geojson-common";
import { importCRS } from "../geojson/geojson-import";
import geom from "../geom/mapshaper-geom";
import { getRoundingFunction } from "../geom/mapshaper-rounding";
import { ArcCollection } from "../paths/mapshaper-arcs";
import { cleanShapes } from "../paths/mapshaper-path-repair-utils";
import { reversePath } from "../paths/mapshaper-path-utils";
import { forEachPoint } from "../points/mapshaper-point-utils";
import TopoJSON from "../topojson/topojson-common";
import { stop } from "../utils/mapshaper-logging";
import utils from "../utils/mapshaper-utils";

// Convert a TopoJSON topology into mapshaper's internal format
// Side-effect: data in topology is modified
//
export function importTopoJSON(topology, opts) {
  var dataset, arcs, layers;

  if (utils.isString(topology)) {
    topology = JSON.parse(topology);
  }

  if (topology.arcs && topology.arcs.length > 0) {
    // TODO: apply transform to ArcCollection, not input arcs
    if (topology.transform) {
      TopoJSON.decodeArcs(topology.arcs, topology.transform);
    }

    if (opts && opts.precision) {
      TopoJSON.roundCoords(topology.arcs, opts.precision);
    }

    arcs = new ArcCollection(topology.arcs);
  }

  layers = Object.keys(topology.objects).reduce((memo, name) => {
    var layers = TopoJSON.importObject(topology.objects[name], arcs, opts),
      lyr;
    for (var i = 0, n = layers.length; i < n; i++) {
      lyr = layers[i];
      lyr.name = name; // TODO: consider type-suffixes if different-typed layers
      memo.push(lyr);
    }
    return memo;
  }, []);

  layers.forEach((lyr) => {
    if (layerHasPaths(lyr)) {
      // Cleaning here may be unnecessary
      // (cleanPathsAfterImport() is called in mapshaper-import.js)
      cleanShapes(lyr.shapes, arcs, lyr.geometry_type);
    }
    if (lyr.geometry_type == "point" && topology.transform) {
      TopoJSON.decodePoints(lyr.shapes, topology.transform);
    }
    if (lyr.data) {
      fixInconsistentFields(lyr.data.getRecords());
    }
  });

  dataset = {
    layers: layers,
    arcs: arcs,
    info: {},
  };
  importCRS(dataset, topology);
  if (topology.metadata) {
    importMetadata(dataset, topology.metadata);
  }
  return dataset;
}

TopoJSON.decodePoints = (shapes, transform) => {
  forEachPoint(shapes, (p) => {
    p[0] = p[0] * transform.scale[0] + transform.translate[0];
    p[1] = p[1] * transform.scale[1] + transform.translate[1];
  });
};

TopoJSON.decodeArcs = (arcs, transform) => {
  var mx = transform.scale[0],
    my = transform.scale[1],
    bx = transform.translate[0],
    by = transform.translate[1];

  arcs.forEach((arc) => {
    var prevX = 0,
      prevY = 0,
      xy,
      x,
      y;
    for (var i = 0, len = arc.length; i < len; i++) {
      xy = arc[i];
      x = xy[0] + prevX;
      y = xy[1] + prevY;
      xy[0] = x * mx + bx;
      xy[1] = y * my + by;
      prevX = x;
      prevY = y;
    }
  });
};

// TODO: consider removing dupes...
TopoJSON.roundCoords = (arcs, precision) => {
  var round = getRoundingFunction(precision),
    p;
  arcs.forEach((arc) => {
    for (var i = 0, len = arc.length; i < len; i++) {
      p = arc[i];
      p[0] = round(p[0]);
      p[1] = round(p[1]);
    }
  });
};

TopoJSON.importObject = (obj, arcs, opts) => {
  var importer = new TopoJSON.GeometryImporter(arcs, opts);
  var geometries = obj.type == "GeometryCollection" ? obj.geometries : [obj];
  geometries.forEach(importer.addGeometryObject, importer);
  return importer.done();
};

//
//
TopoJSON.GeometryImporter = function (arcs, opts) {
  var idField = (opts && opts.id_field) || GeoJSON.ID_FIELD,
    properties = [],
    shapes = [], // topological ids
    types = [],
    dataNulls = 0,
    shapeNulls = 0,
    collectionType = null,
    shapeId;

  this.addGeometryObject = function (geom) {
    var rec = geom.properties || null;
    shapeId = shapes.length;
    shapes[shapeId] = null;
    if ("id" in geom) {
      rec = rec || {};
      rec[idField] = geom.id;
    }
    properties[shapeId] = rec;
    if (!rec) dataNulls++;
    if (geom.type) {
      this.addShape(geom);
    }
    if (shapes[shapeId] === null) {
      shapeNulls++;
    }
  };

  this.addShape = function (geom) {
    var curr = shapes[shapeId];
    var type = GeoJSON.translateGeoJSONType(geom.type);
    var shape, importer;
    if (geom.type == "GeometryCollection") {
      geom.geometries.forEach(this.addShape, this);
    } else if (type) {
      this.setGeometryType(type);
      shape = TopoJSON.shapeImporters[geom.type](geom, arcs);
      // TODO: better shape validation
      if (!shape || !shape.length) {
        // do nothing
      } else if (!Array.isArray(shape[0])) {
        stop("Invalid TopoJSON", geom.type, "geometry");
      } else {
        shapes[shapeId] = curr ? curr.concat(shape) : shape;
      }
    } else if (geom.type) {
      stop("Invalid TopoJSON geometry type:", geom.type);
    }
  };

  this.setGeometryType = function (type) {
    var currType = shapeId < types.length ? types[shapeId] : null;
    if (!currType) {
      types[shapeId] = type;
      this.updateCollectionType(type);
    } else if (currType != type) {
      stop("Unable to import mixed-type TopoJSON geometries");
    }
  };

  this.updateCollectionType = (type) => {
    if (!collectionType) {
      collectionType = type;
    } else if (type && collectionType != type) {
      collectionType = "mixed";
    }
  };

  this.done = () => {
    var layers;
    if (collectionType == "mixed") {
      layers = divideFeaturesByType(shapes, properties, types);
    } else {
      layers = [
        {
          geometry_type: collectionType,
          shapes: collectionType ? shapes : null,
          data: dataNulls < shapes.length ? new DataTable(properties) : null,
        },
      ];
    }
    return layers;
  };
};

// TODO: check that interior ring bboxes are contained in external ring
// TODO: check that rings are closed
TopoJSON.importPolygonArcs = (rings, arcs) => {
  var ring = rings[0],
    imported = null,
    area;
  if (!arcs) stop("Invalid TopoJSON file: missing arc data.");
  area = ring ? geom.getPlanarPathArea(ring, arcs) : null;
  if (!area) {
    return null;
  }
  if (area < 0) reversePath(ring);
  imported = [ring];
  for (var i = 1; i < rings.length; i++) {
    ring = rings[i];
    area = geom.getPlanarPathArea(ring, arcs);
    if (!area) continue;
    if (area > 0) reversePath(ring);
    imported.push(ring);
  }
  return imported;
};

TopoJSON.shapeImporters = {
  Point: (geom) => [geom.coordinates],
  MultiPoint: (geom) => geom.coordinates,
  LineString: (geom) => [geom.arcs],
  MultiLineString: (geom) => geom.arcs,
  Polygon: (geom, arcColl) => TopoJSON.importPolygonArcs(geom.arcs, arcColl),
  MultiPolygon: (geom, arcColl) =>
    geom.arcs.reduce((memo, arr) => {
      var rings = TopoJSON.importPolygonArcs(arr, arcColl);
      if (rings) {
        memo = memo ? memo.concat(rings) : rings;
      }
      return memo;
    }, null),
};
