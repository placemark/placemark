import { internal, utils } from "./gui-core";

var darkStroke = "#334",
  lightStroke = "#b7d9ea",
  violet = "#cc6acc",
  violetFill = "rgba(249, 170, 249, 0.32)",
  gold = "#efc100",
  black = "black",
  grey = "#888",
  selectionFill = "rgba(237, 214, 0, 0.12)",
  hoverFill = "rgba(255, 180, 255, 0.2)",
  activeStyle = {
    // outline style for the active layer
    type: "outline",
    strokeColors: [lightStroke, darkStroke],
    strokeWidth: 0.7,
    dotColor: "#223",
    dotSize: 1,
  },
  activeStyleForLabels = {
    dotColor: "rgba(250, 0, 250, 0.45)", // violet dot with transparency
    dotSize: 1,
  },
  referenceStyle = {
    // outline style for reference layers
    type: "outline",
    strokeColors: [null, "#86c927"],
    strokeWidth: 0.85,
    dotColor: "#73ba20",
    dotSize: 1,
  },
  intersectionStyle = {
    dotColor: "#F24400",
    dotSize: 1,
  },
  hoverStyles = {
    polygon: {
      fillColor: hoverFill,
      strokeColor: black,
      strokeWidth: 1.2,
    },
    point: {
      dotColor: violet, // black,
      dotSize: 2.5,
    },
    polyline: {
      strokeColor: black,
      strokeWidth: 2.5,
    },
  },
  unselectedHoverStyles = {
    polygon: {
      fillColor: "rgba(0,0,0,0)",
      strokeColor: black,
      strokeWidth: 1.2,
    },
    point: {
      dotColor: black, // grey,
      dotSize: 2,
    },
    polyline: {
      strokeColor: black, // grey,
      strokeWidth: 2.5,
    },
  },
  selectionStyles = {
    polygon: {
      fillColor: hoverFill,
      strokeColor: black,
      strokeWidth: 1.2,
    },
    point: {
      dotColor: violet, // black,
      dotSize: 1.5,
    },
    polyline: {
      strokeColor: violet, //  black,
      strokeWidth: 2.5,
    },
  },
  // not used
  selectionHoverStyles = {
    polygon: {
      fillColor: selectionFill,
      strokeColor: black,
      strokeWidth: 1.2,
    },
    point: {
      dotColor: black,
      dotSize: 1.5,
    },
    polyline: {
      strokeColor: black,
      strokeWidth: 2,
    },
  },
  pinnedStyles = {
    polygon: {
      fillColor: violetFill,
      strokeColor: violet,
      strokeWidth: 1.8,
    },
    point: {
      dotColor: violet,
      dotSize: 3,
    },
    polyline: {
      strokeColor: black, // violet,
      strokeWidth: 3,
    },
  };

export function getIntersectionStyle(lyr) {
  return getDefaultStyle(lyr, intersectionStyle);
}

function getDefaultStyle(lyr, baseStyle) {
  var style = utils.extend({}, baseStyle);
  // reduce the dot size of large point layers
  if (lyr.geometry_type == "point" && style.dotSize > 0) {
    style.dotSize *= getDotScale(lyr);
  }
  return style;
}

function getDotScale(lyr) {
  var topTier = 50000;
  var n = countPoints(lyr.shapes, topTier + 2); // short-circuit point counting above top threshold
  var k = (n < 200 && 4) || (n < 2500 && 3) || (n < 10000 && 2) || 1;
  // var k = n >= topTier && 0.25 || n > 10000 && 0.45 || n > 2500 && 0.65 || n > 200 && 0.85 || 1;
  return k;
}

function countPoints(shapes, max) {
  var count = 0;
  var i, n, shp;
  max = max || Infinity;
  for (i = 0, n = shapes.length; i < n && count <= max; i++) {
    shp = shapes[i];
    count += shp ? shp.length : 0;
  }
  return count;
}

// Style for unselected layers with visibility turned on
// (styled layers have)
export function getReferenceStyle(lyr) {
  var style;
  if (layerHasCanvasDisplayStyle(lyr)) {
    style = getCanvasDisplayStyle(lyr);
  } else if (internal.layerHasLabels(lyr)) {
    style = { dotSize: 0 }; // no reference dots if labels are visible
  } else {
    style = getDefaultStyle(lyr, referenceStyle);
  }
  return style;
}

export function getActiveStyle(lyr) {
  var style;
  if (layerHasCanvasDisplayStyle(lyr)) {
    style = getCanvasDisplayStyle(lyr);
  } else if (internal.layerHasLabels(lyr)) {
    style = getDefaultStyle(lyr, activeStyleForLabels);
  } else {
    style = getDefaultStyle(lyr, activeStyle);
  }
  return style;
}

// Returns a display style for the overlay layer.
// The overlay layer renders several kinds of feature, each of which is displayed
// with a different style.
//
// * hover shapes
// * selected shapes
// * pinned shapes
//
export function getOverlayStyle(lyr, o) {
  var geomType = lyr.geometry_type;
  var topId = o.id; // pinned id (if pinned) or hover id
  var topIdx = -1;
  var styler = function (o, i) {
    utils.extend(o, i === topIdx ? topStyle : baseStyle);
  };
  var baseStyle = getDefaultStyle(lyr, selectionStyles[geomType]);
  var topStyle;
  var ids = o.ids.filter(function (i) {
    return i != o.id; // move selected id to the end
  });
  if (o.id > -1) {
    topStyle = getSelectedFeatureStyle(lyr, o);
    topIdx = ids.length;
    ids.push(o.id); // put the pinned/hover feature last in the render order
  }
  var overlayStyle = {
    styler: styler,
    ids: ids,
    overlay: true,
  };
  if (layerHasCanvasDisplayStyle(lyr)) {
    if (geomType == "point") {
      overlayStyle.styler = getOverlayPointStyler(
        getCanvasDisplayStyle(lyr).styler,
        styler
      );
    }
    overlayStyle.type = "styled";
  }
  return ids.length > 0 ? overlayStyle : null;
}

function getSelectedFeatureStyle(lyr, o) {
  var isPinned = o.pinned;
  var inSelection = o.ids.indexOf(o.id) > -1;
  var geomType = lyr.geometry_type;
  var style;
  if (isPinned) {
    // a feature is pinned
    style = pinnedStyles[geomType];
  } else if (inSelection) {
    // normal hover, or hover id is in the selection set
    style = hoverStyles[geomType];
  } else {
    // features are selected, but hover id is not in the selection set
    style = unselectedHoverStyles[geomType];
  }
  return getDefaultStyle(lyr, style);
}

// Modify style to use scaled circle instead of dot symbol
function getOverlayPointStyler(baseStyler, overlayStyler) {
  return function (obj, i) {
    var dotColor;
    var id = obj.ids ? obj.ids[i] : -1;
    obj.strokeWidth = 0; // kludge to support setting minimum stroke width
    baseStyler(obj, id);
    if (overlayStyler) {
      overlayStyler(obj, i);
    }
    dotColor = obj.dotColor;
    if (obj.radius && dotColor) {
      obj.radius += 0.4;
      // delete obj.fillColor; // only show outline
      obj.fillColor = dotColor; // comment out to only highlight stroke
      obj.strokeColor = dotColor;
      obj.strokeWidth = Math.max(obj.strokeWidth + 0.8, 1.5);
      obj.opacity = 1;
    }
  };
}

function getCanvasDisplayStyle(lyr) {
  var styleIndex = {
      opacity: "opacity",
      r: "radius",
      fill: "fillColor",
      stroke: "strokeColor",
      "fill-pattern": "fillPattern",
      "stroke-width": "strokeWidth",
      "stroke-dasharray": "lineDash",
      "stroke-opacity": "strokeOpacity",
      "fill-opacity": "fillOpacity",
    },
    // array of field names of relevant svg display properties
    fields = getCanvasStyleFields(lyr).filter(function (f) {
      return f in styleIndex;
    }),
    records = lyr.data.getRecords();
  var styler = function (style, i) {
    var rec = records[i];
    var fname, val;
    for (var j = 0; j < fields.length; j++) {
      fname = fields[j];
      val = rec && rec[fname];
      if (val == "none") {
        val = "transparent"; // canvas equivalent of CSS 'none'
      }
      // convert svg property name to mapshaper style equivalent
      style[styleIndex[fname]] = val;
    }

    if (style.strokeWidth && !style.strokeColor) {
      style.strokeColor = "black";
    }
    if (!("strokeWidth" in style) && style.strokeColor) {
      style.strokeWidth = 1;
    }
    if (
      style.radius > 0 &&
      !style.strokeWidth &&
      !style.fillColor &&
      lyr.geometry_type == "point"
    ) {
      style.fillColor = "black";
    }
  };
  return { styler: styler, type: "styled" };
}

// check if layer should be displayed with styles
function layerHasCanvasDisplayStyle(lyr) {
  var fields = getCanvasStyleFields(lyr);
  if (lyr.geometry_type == "point") {
    return fields.indexOf("r") > -1; // require 'r' field for point symbols
  }
  return utils.difference(fields, ["opacity", "class"]).length > 0;
}

function getCanvasStyleFields(lyr) {
  var fields = lyr.data ? lyr.data.getFields() : [];
  return internal.findPropertiesBySymbolGeom(fields, lyr.geometry_type);
}
