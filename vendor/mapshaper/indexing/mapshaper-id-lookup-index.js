import { error } from "../utils/mapshaper-logging";
import utils from "../utils/mapshaper-utils";

// Map positive or negative integer ids to non-negative integer ids
export function IdLookupIndex(n, clearable) {
  var fwdIndex = new Int32Array(n);
  var revIndex = new Int32Array(n);
  var setList = [];
  utils.initializeArray(fwdIndex, -1);
  utils.initializeArray(revIndex, -1);

  this.setId = (id, val) => {
    if (clearable && !this.hasId(id)) {
      setList.push(id);
    }
    if (id < 0) {
      revIndex[~id] = val;
    } else {
      fwdIndex[id] = val;
    }
  };

  this.clear = () => {
    if (!clearable) {
      error("Index is not clearable");
    }
    setList.forEach((id) => {
      this.setId(id, -1);
    });
    setList = [];
  };

  this.clearId = (id) => {
    if (!this.hasId(id)) {
      error("Tried to clear an unset id");
    }
    this.setId(id, -1);
  };

  this.hasId = (id) => {
    var val = this.getId(id);
    return val > -1;
  };

  this.getId = (id) => {
    var idx = id < 0 ? ~id : id;
    if (idx >= n) {
      return -1; // TODO: consider throwing an error?
    }
    return id < 0 ? revIndex[idx] : fwdIndex[idx];
  };
}
