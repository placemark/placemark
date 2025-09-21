var ShpType = {
  NULL: 0,
  POINT: 1,
  POLYLINE: 3,
  POLYGON: 5,
  MULTIPOINT: 8,
  POINTZ: 11,
  POLYLINEZ: 13,
  POLYGONZ: 15,
  MULTIPOINTZ: 18,
  POINTM: 21,
  POLYLINEM: 23,
  POLYGONM: 25,
  MULIPOINTM: 28,
  MULTIPATCH: 31, // not supported
};

export default ShpType;

ShpType.isPolygonType = (t) => t == 5 || t == 15 || t == 25;

ShpType.isPolylineType = (t) => t == 3 || t == 13 || t == 23;

ShpType.isMultiPartType = (t) =>
  ShpType.isPolygonType(t) || ShpType.isPolylineType(t);

ShpType.isMultiPointType = (t) => t == 8 || t == 18 || t == 28;

ShpType.isZType = (t) => [11, 13, 15, 18].includes(t);

ShpType.isMType = (t) => ShpType.isZType(t) || [21, 23, 25, 28].includes(t);

ShpType.hasBounds = (t) =>
  ShpType.isMultiPartType(t) || ShpType.isMultiPointType(t);
