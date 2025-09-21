import { DataTable } from "../datatable/mapshaper-data-table";
import DbfReader from "../shapefile/dbf-reader";
import Dbf from "../shapefile/dbf-writer";

export function importDbfTable(buf, o) {
  var opts = o || {};
  return new ShapefileTable(buf, opts.encoding);
}

// Implements the DataTable api for DBF file data.
// We avoid touching the raw DBF field data if possible. This way, we don't need
// to parse the DBF at all in common cases, like importing a Shapefile, editing
// just the shapes and exporting in Shapefile format.
// TODO: consider accepting just the filename, so buffer doesn't consume memory needlessly.
//
function ShapefileTable(buf, encoding) {
  var reader = new DbfReader(buf, encoding),
    altered = false,
    table;

  function getTable() {
    if (!table) {
      // export DBF records on first table access
      table = new DataTable(reader.readRows());
      reader = null;
      buf = null; // null out references to DBF data for g.c.
    }
    return table;
  }

  this.exportAsDbf = (opts) => {
    // export original dbf bytes if possible, for performance
    var useOriginal =
      !!reader && !altered && !opts.field_order && !opts.encoding;
    if (useOriginal) return reader.getBuffer();
    return Dbf.exportRecords(
      getTable().getRecords(),
      opts.encoding,
      opts.field_order,
    );
  };

  this.getReadOnlyRecordAt = (i) =>
    reader ? reader.readRow(i) : table.getReadOnlyRecordAt(i);

  this.deleteField = (f) => {
    if (table) {
      table.deleteField(f);
    } else {
      altered = true;
      reader.deleteField(f);
    }
  };

  this.getRecords = () => getTable().getRecords();

  this.getFields = () => (reader ? reader.getFields() : table.getFields());

  this.isEmpty = function () {
    return reader ? this.size() === 0 : table.isEmpty();
  };

  this.size = () => (reader ? reader.size() : table.size());
}

Object.assign(ShapefileTable.prototype, DataTable.prototype);
