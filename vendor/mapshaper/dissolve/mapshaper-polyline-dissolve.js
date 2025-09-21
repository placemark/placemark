import { absArcId } from "../paths/mapshaper-arc-utils";
import { traversePaths } from "../paths/mapshaper-path-utils";
import { NodeCollection } from "../topology/mapshaper-nodes";

// Dissolve polyline features
export function dissolvePolylineGeometry(lyr, getGroupId, arcs, opts) {
  var groups = getPolylineDissolveGroups(lyr.shapes, getGroupId);
  var dissolve = getPolylineDissolver(arcs);
  return groups.map(dissolve);
}

// Create one array of arc ids for each group
function getPolylineDissolveGroups(shapes, getGroupId) {
  var groups = [];
  traversePaths(shapes, (o) => {
    var groupId = getGroupId(o.shapeId);
    if (groupId in groups === false) {
      groups[groupId] = [];
    }
    groups[groupId].push(o.arcId);
  });
  return groups;
}

function getPolylineDissolver(arcs) {
  var flags = new Uint8Array(arcs.size());
  var testArc = (id) => flags[absArcId(id)] > 0;
  var useArc = (id) => {
    flags[absArcId(id)] = 0;
  };
  var nodes = new NodeCollection(arcs);
  return (ids) => {
    ids.forEach((id) => {
      flags[absArcId(id)] = 1;
    });
    var ends = findPolylineEnds(ids, nodes, testArc);
    var straightParts = collectPolylineArcs(ends, nodes, testArc, useArc);
    var ringParts = collectPolylineArcs(ids, nodes, testArc, useArc);
    var allParts = straightParts.concat(ringParts);
    ids.forEach((id) => {
      flags[absArcId(id)] = 0;
    }); // may not be necessary
    return allParts;
  };
}

/*



*/

// TODO: use polygon pathfinder shared code
function collectPolylineArcs(ids, nodes, testArc, useArc) {
  var parts = [];
  ids.forEach((startId) => {
    var part = [];
    var nextId = startId;
    var nextIds;
    while (testArc(nextId)) {
      part.push(nextId);
      nextIds = testArc(nextId) ? nodes.getConnectedArcs(nextId, testArc) : [];
      useArc(nextId); // use (unset) arc after connections have been found
      if (nextIds.length > 0) {
        nextId = ~nextIds[0]; // switch arc direction to lead away from node
      } else {
        break;
      }
    }
    if (part.length > 0) parts.push(part);
  });
  return parts;
}

// Return array of dead-end arcs for a dissolved group.
function findPolylineEnds(ids, nodes, filter) {
  var ends = [];
  ids.forEach((arcId) => {
    if (nodes.getConnectedArcs(arcId, filter).length === 0) {
      ends.push(~arcId); // arc points away from terminus
    }
    if (nodes.getConnectedArcs(~arcId, filter).length === 0) {
      ends.push(arcId);
    }
  });
  return ends;
}
