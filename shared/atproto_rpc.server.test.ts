import { Schema } from "effect";
import { expect, it } from "vitest";
import {
  CloudMapDocument,
  CloudMapSummary,
  MapRpcs,
  RecordNotFound,
  Unauthenticated,
} from "./atproto_rpc";

it("round-trips a CloudMapDocument", () => {
  const input = {
    dataBase64: "AAAA",
    symbolization: { type: "none" },
    layer: null,
    folders: [],
    layerConfigs: [],
  };
  expect(Schema.decodeUnknownSync(CloudMapDocument)(input)).toMatchObject(input);
});

it("round-trips a CloudMapSummary", () => {
  const input = {
    rkey: "3abc123",
    name: "My map",
    updatedAt: "2026-10-07T00:00:00.000Z",
  };
  expect(Schema.decodeUnknownSync(CloudMapSummary)(input)).toEqual(input);
});

it("tags errors with their names", () => {
  // The tags cross the wire, so they're a contract.
  expect(new Unauthenticated({})._tag).toBe("Unauthenticated");
  expect(new RecordNotFound({ rkey: "3abc123" })._tag).toBe("RecordNotFound");
});

it("exposes all seven RPC methods on MapRpcs", () => {
  expect(Array.from(MapRpcs.requests.keys())).toStrictEqual([
    "Me",
    "Logout",
    "ListMaps",
    "SaveMap",
    "LoadMap",
    "UpdateMap",
    "DeleteMap",
  ]);
});
