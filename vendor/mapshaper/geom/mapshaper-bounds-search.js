import Flatbush from "flatbush";

// Returns a search function
// Receives array of objects to index; objects must have a 'bounds' member
//    that is a Bounds object.
export function getBoundsSearchFunction(boxes) {
  var index;
  if (!boxes.length) {
    // Unlike rbush, flatbush doesn't allow size 0 indexes; workaround
    return function () {
      return [];
    };
  }
  index = new Flatbush(boxes.length);
  boxes.forEach(function (ring) {
    var b = ring.bounds;
    index.add(b.xmin, b.ymin, b.xmax, b.ymax);
  });
  index.finish();

  function idxToObj(i) {
    return boxes[i];
  }

  // Receives xmin, ymin, xmax, ymax parameters
  // Returns subset of original @bounds array
  return function (a, b, c, d) {
    return index.search(a, b, c, d).map(idxToObj);
  };
}
