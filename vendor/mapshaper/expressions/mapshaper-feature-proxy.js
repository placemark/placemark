import {
  layerHasPaths,
  layerHasPoints,
} from "../dataset/mapshaper-layer-utils";
import { addGetters } from "../expressions/mapshaper-expression-utils";
import { addLayerGetters } from "../expressions/mapshaper-layer-proxy";
import geom from "../geom/mapshaper-geom";
import { WGS84 } from "../geom/mapshaper-geom-constants";
import { getInnerPctCalcFunction } from "../geom/mapshaper-perimeter-calc";
import { findAnchorPoint } from "../points/mapshaper-anchor-points";
import { stop } from "../utils/mapshaper-logging";
import utils from "../utils/mapshaper-utils";

// Returns a function to return a feature proxy by id
// (the proxy appears as "this" or "$" in a feature expression)
export function initFeatureProxy(lyr, arcs, optsArg) {
  var opts = optsArg || {},
    hasPoints = layerHasPoints(lyr),
    hasPaths = arcs && layerHasPaths(lyr),
    _records = lyr.data ? lyr.data.getRecords() : null,
    _isPlanar = hasPaths && arcs.isPlanar(),
    ctx = {},
    calcInnerPct,
    _bounds,
    _centroid,
    _innerXY,
    _xy,
    _ids,
    _id;

  // all contexts have this.id and this.layer
  addGetters(ctx, {
    id: () => _id,
  });
  addLayerGetters(ctx, lyr, arcs);

  if (opts.geojson_editor) {
    Object.defineProperty(ctx, "geojson", {
      set: (o) => {
        opts.geojson_editor.set(o, _id);
      },
      get: () => opts.geojson_editor.get(_id),
    });
  }

  if (_records) {
    // add r/w member "properties"
    Object.defineProperty(ctx, "properties", {
      set: (obj) => {
        if (utils.isObject(obj)) {
          _records[_id] = obj;
        } else {
          stop("Can't assign non-object to $.properties");
        }
      },
      get: () => {
        var rec = _records[_id];
        if (!rec) {
          rec = _records[_id] = {};
        }
        return rec;
      },
    });
  }

  if (hasPaths) {
    addGetters(ctx, {
      // TODO: count hole/s + containing ring as one part
      partCount: () => (_ids ? _ids.length : 0),
      isNull: () => ctx.partCount === 0,
      bounds: () => shapeBounds().toArray(),
      height: () => shapeBounds().height(),
      width: () => shapeBounds().width(),
    });

    if (lyr.geometry_type == "polyline") {
      addGetters(ctx, {
        length: () => geom.getShapePerimeter(_ids, arcs),
      });
    }

    if (lyr.geometry_type == "polygon") {
      addGetters(ctx, {
        area: () =>
          _isPlanar ? ctx.planarArea : geom.getSphericalShapeArea(_ids, arcs),
        // area2: function() {
        //   return _isPlanar ? ctx.planarArea : geom.getSphericalShapeArea(_ids, arcs, WGS84.SEMIMINOR_RADIUS);
        // },
        // area3: function() {
        //   return _isPlanar ? ctx.planarArea : geom.getSphericalShapeArea(_ids, arcs, WGS84.AUTHALIC_RADIUS);
        // },
        perimeter: () => geom.getShapePerimeter(_ids, arcs),
        compactness: () =>
          geom.calcPolsbyPopperCompactness(ctx.area, ctx.perimeter),
        planarArea: () => geom.getPlanarShapeArea(_ids, arcs),
        innerPct: () => {
          if (!calcInnerPct)
            calcInnerPct = getInnerPctCalcFunction(arcs, lyr.shapes);
          return calcInnerPct(_ids);
        },
        originalArea: () => {
          // Get area
          var i = arcs.getRetainedInterval(),
            area;
          arcs.setRetainedInterval(0);
          area = ctx.area;
          arcs.setRetainedInterval(i);
          return area;
        },
        centroidX: () => {
          var p = centroid();
          return p ? p.x : null;
        },
        centroidY: () => {
          var p = centroid();
          return p ? p.y : null;
        },
        innerX: () => {
          var p = innerXY();
          return p ? p.x : null;
        },
        innerY: () => {
          var p = innerXY();
          return p ? p.y : null;
        },
      });
    }
  } else if (hasPoints) {
    // TODO: add functions like bounds, isNull, pointCount
    Object.defineProperty(ctx, "coordinates", {
      set: (obj) => {
        if (!obj || utils.isArray(obj)) {
          lyr.shapes[_id] = obj || null;
        } else {
          stop("Can't assign non-array to $.coordinates");
        }
      },
      get: () => lyr.shapes[_id] || null,
    });
    Object.defineProperty(ctx, "x", {
      get: () => {
        xy();
        return _xy ? _xy[0] : null;
      },
      set: (val) => {
        xy();
        if (_xy) _xy[0] = Number(val);
      },
    });
    Object.defineProperty(ctx, "y", {
      get: () => {
        xy();
        return _xy ? _xy[1] : null;
      },
      set: (val) => {
        xy();
        if (_xy) _xy[1] = Number(val);
      },
    });
  }

  function xy() {
    var shape = lyr.shapes[_id];
    if (!_xy) {
      _xy = (shape && shape[0]) || null;
    }
  }

  function centroid() {
    _centroid = _centroid || geom.getShapeCentroid(_ids, arcs);
    return _centroid;
  }

  function innerXY() {
    _innerXY = _innerXY || findAnchorPoint(_ids, arcs);
    return _innerXY;
  }

  function shapeBounds() {
    if (!_bounds) {
      _bounds = arcs.getMultiShapeBounds(_ids);
    }
    return _bounds;
  }

  return (id) => {
    _id = id;
    // reset stored values
    if (hasPaths) {
      _bounds = null;
      _centroid = null;
      _innerXY = null;
      _ids = lyr.shapes[id];
    }
    if (hasPoints) {
      _xy = null;
    }
    return ctx;
  };
}
