import * as Geom from "../geom/mapshaper-basic-geom";
import * as PathGeom from "../geom/mapshaper-path-geom";
import * as PolygonGeom from "../geom/mapshaper-polygon-geom";
import * as SegmentGeom from "../geom/mapshaper-segment-geom";
import * as PolygonCentroid from "../points/mapshaper-polygon-centroid";

export default Object.assign(
  {},
  Geom,
  PolygonGeom,
  PathGeom,
  SegmentGeom,
  PolygonCentroid,
);
