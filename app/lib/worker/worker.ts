import { getIssues } from "@placemarkio/check-geojson";
import { fromGeoJSON, fileToGeoJSON } from "app/lib/convert";
import * as Comlink from "comlink";
import { EitherHandler } from "./shared";
import { bufferFeature } from "app/lib/buffer";
import { booleanFeatures } from "app/lib/map_operations/boolean_features";

const lib = {
  getIssues,
  bufferFeature,
  booleanFeatures,
  fileToGeoJSON,
  fromGeoJSON,
};

export type Lib = typeof lib;

Comlink.transferHandlers.set("EITHER", EitherHandler);
Comlink.expose(lib);
