import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import {
  CloudMapDocument,
  CloudMapSummary,
  MapRpcs,
  RecordNotFound,
  Unauthenticated,
} from "./atproto_rpc";

describe("atproto_rpc schema", () => {
  it("round-trips a CloudMapDocument", () => {
    const input = {
      dataBase64: "AAAA",
      symbolization: { type: "none" },
      layer: null,
      folders: [],
      layerConfigs: [],
    };
    const decoded = Schema.decodeUnknownSync(CloudMapDocument)(input);
    expect(decoded).toMatchObject(input);
  });

  it("round-trips a CloudMapSummary", () => {
    const input = {
      rkey: "3abc123",
      name: "My map",
      updatedAt: "2026-10-07T00:00:00.000Z",
    };
    const decoded = Schema.decodeUnknownSync(CloudMapSummary)(input);
    expect(decoded).toEqual(input);
  });

  it("tags Unauthenticated and RecordNotFound errors correctly", () => {
    const unauth = new Unauthenticated({});
    const notFound = new RecordNotFound({ rkey: "3abc123" });
    expect(unauth._tag).toBe("Unauthenticated");
    expect(notFound._tag).toBe("RecordNotFound");
    expect(notFound.rkey).toBe("3abc123");
  });

  it("exposes all seven RPC methods on MapRpcs", () => {
    const names = Array.from(MapRpcs.requests.keys());
    expect(names).toStrictEqual([
      "Me",
      "Logout",
      "ListMaps",
      "SaveMap",
      "LoadMap",
      "UpdateMap",
      "DeleteMap",
    ]);
  });
});
