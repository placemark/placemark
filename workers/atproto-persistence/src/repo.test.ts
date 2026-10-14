import { describe, expect, it, vi } from "vitest";
import { Effect } from "effect";
import type { Client } from "@atcute/client";
import { AtprotoRepo, AtprotoRepoLive } from "./repo";
import { CloudMapSummary, RecordNotFound } from "../../../shared/atproto_rpc";

const COLLECTION = "io.placemark.map";

function fakeClient(responses: Record<string, unknown>) {
  const calls: Array<{ method: string; nsid: string; args: unknown }> = [];
  const client = {
    post: vi.fn(async (nsid: string, args: unknown) => {
      calls.push({ method: "post", nsid, args });
      return { ok: true, data: responses[nsid] };
    }),
    get: vi.fn(async (nsid: string, args: unknown) => {
      calls.push({ method: "get", nsid, args });
      return { ok: true, data: responses[nsid] };
    }),
  };
  return { client: client as unknown as Client, calls };
}

/** Digs the `input.record` object out of a recorded `putRecord` call. */
function writtenRecord(args: unknown): object {
  if (
    typeof args !== "object" ||
    args === null ||
    !("input" in args) ||
    typeof args.input !== "object" ||
    args.input === null ||
    !("record" in args.input) ||
    typeof args.input.record !== "object" ||
    args.input.record === null
  ) {
    throw new Error("expected putRecord to be called with an input.record object");
  }
  return args.input.record;
}

describe("AtprotoRepo", () => {
  it("lists maps for a DID", async () => {
    const { client, calls } = fakeClient({
      "com.atproto.repo.listRecords": {
        records: [
          {
            uri: "at://did:plc:abc/io.placemark.map/3a",
            cid: "bafy1",
            value: { name: "Trip", updatedAt: "2026-10-07T00:00:00.000Z" },
          },
        ],
      },
    });

    const program = Effect.gen(function* () {
      const repo = yield* AtprotoRepo;
      return yield* repo.listMaps("did:plc:abc");
    }).pipe(Effect.provide(AtprotoRepoLive(client)));

    const result = await Effect.runPromise(program);
    expect(result).toStrictEqual([
      new CloudMapSummary({ rkey: "3a", name: "Trip", updatedAt: "2026-10-07T00:00:00.000Z" }),
    ]);
    expect(calls[0]).toMatchObject({
      nsid: "com.atproto.repo.listRecords",
      args: { params: { repo: "did:plc:abc", collection: COLLECTION } },
    });
  });

  const FAKE_BLOB_CID = `bafyrei${"a".repeat(52)}`;

  // The fixture below has no `layer` key: `layer` is optional in the
  // lexicon and omitted by `putMap` when the map has no base layer, so
  // reading it back must normalize the absent key to `null`.
  it("gets a map record by rkey, normalizing an absent layer to null", async () => {
    const fakeBytes = new Uint8Array([9, 9, 9]);
    const { client, calls } = fakeClient({
      "com.atproto.repo.getRecord": {
        uri: "at://did:plc:abc/io.placemark.map/3a",
        cid: "bafy1",
        value: {
          name: "Trip",
          updatedAt: "2026-10-07T00:00:00.000Z",
          data: {
            $type: "blob",
            ref: { $link: FAKE_BLOB_CID },
            mimeType: "application/flatgeobuf",
            size: 3,
          },
          symbolization: "{}",
          folders: "[]",
          layerConfigs: "[]",
        },
      },
      "com.atproto.sync.getBlob": fakeBytes,
    });

    const program = Effect.gen(function* () {
      const repo = yield* AtprotoRepo;
      return yield* repo.getMap("did:plc:abc", "3a");
    }).pipe(Effect.provide(AtprotoRepoLive(client)));

    const result = await Effect.runPromise(program);
    expect(result).toStrictEqual({
      name: "Trip",
      symbolization: {},
      layer: null,
      folders: [],
      layerConfigs: [],
      dataBytes: fakeBytes,
    });

    const blobCall = calls.find((call) => call.nsid === "com.atproto.sync.getBlob");
    expect(blobCall).toMatchObject({
      method: "get",
      args: { params: { did: "did:plc:abc", cid: FAKE_BLOB_CID }, as: "bytes" },
    });
  });

  it("gets a map record by rkey, keeping a layer that is present", async () => {
    const { client } = fakeClient({
      "com.atproto.repo.getRecord": {
        uri: "at://did:plc:abc/io.placemark.map/3a",
        cid: "bafy1",
        value: {
          name: "Trip",
          updatedAt: "2026-10-07T00:00:00.000Z",
          data: {
            $type: "blob",
            ref: { $link: FAKE_BLOB_CID },
            mimeType: "application/flatgeobuf",
            size: 3,
          },
          symbolization: "{}",
          layer: JSON.stringify({ name: "Monochrome" }),
          folders: "[]",
          layerConfigs: "[]",
        },
      },
      "com.atproto.sync.getBlob": new Uint8Array([9, 9, 9]),
    });

    const program = Effect.gen(function* () {
      const repo = yield* AtprotoRepo;
      return yield* repo.getMap("did:plc:abc", "3a");
    }).pipe(Effect.provide(AtprotoRepoLive(client)));

    const result = await Effect.runPromise(program);
    expect(result.layer).toStrictEqual({ name: "Monochrome" });
  });

  it("fails with RecordNotFound when getRecord returns an error response", async () => {
    const calls: Array<{ method: string; nsid: string; args: unknown }> = [];
    const client = {
      post: vi.fn(),
      get: vi.fn(async (nsid: string, args: unknown) => {
        calls.push({ method: "get", nsid, args });
        return { ok: false, data: { error: "RecordNotFound" } };
      }),
    } as unknown as Client;

    const program = Effect.gen(function* () {
      const repo = yield* AtprotoRepo;
      return yield* repo.getMap("did:plc:abc", "missing");
    }).pipe(Effect.provide(AtprotoRepoLive(client)));

    const error = await Effect.runPromise(Effect.flip(program));
    expect(error).toStrictEqual(new RecordNotFound({ rkey: "missing" }));
  });

  it("gets a map record summary by rkey without fetching the blob", async () => {
    const { client, calls } = fakeClient({
      "com.atproto.repo.getRecord": {
        uri: "at://did:plc:abc/io.placemark.map/3a",
        cid: "bafy1",
        value: {
          name: "Trip",
          updatedAt: "2026-10-07T00:00:00.000Z",
          data: {
            $type: "blob",
            ref: { $link: FAKE_BLOB_CID },
            mimeType: "application/flatgeobuf",
            size: 3,
          },
          symbolization: {},
          layer: null,
          folders: [],
          layerConfigs: [],
        },
      },
    });

    const program = Effect.gen(function* () {
      const repo = yield* AtprotoRepo;
      return yield* repo.getMapSummary("did:plc:abc", "3a");
    }).pipe(Effect.provide(AtprotoRepoLive(client)));

    const result = await Effect.runPromise(program);
    expect(result).toStrictEqual({ name: "Trip" });

    // The whole point of `getMapSummary` is to avoid the extra
    // `com.atproto.sync.getBlob` round trip that `getMap` makes.
    expect(calls.some((call) => call.nsid === "com.atproto.sync.getBlob")).toBe(false);
    expect(calls).toHaveLength(1);
  });

  it("getMapSummary fails with RecordNotFound when getRecord returns an error response", async () => {
    const client = {
      post: vi.fn(),
      get: vi.fn(async () => ({ ok: false, data: { error: "RecordNotFound" } })),
    } as unknown as Client;

    const program = Effect.gen(function* () {
      const repo = yield* AtprotoRepo;
      return yield* repo.getMapSummary("did:plc:abc", "missing");
    }).pipe(Effect.provide(AtprotoRepoLive(client)));

    const error = await Effect.runPromise(Effect.flip(program));
    expect(error).toStrictEqual(new RecordNotFound({ rkey: "missing" }));
  });

  it("puts a map record with a blob ref", async () => {
    const { client, calls } = fakeClient({
      "com.atproto.repo.uploadBlob": { blob: { $type: "blob", ref: "fake-ref" } },
      "com.atproto.repo.putRecord": { uri: "at://did:plc:abc/io.placemark.map/3a", cid: "bafy2" },
    });

    const program = Effect.gen(function* () {
      const repo = yield* AtprotoRepo;
      return yield* repo.putMap(
        "did:plc:abc",
        "3a",
        { name: "Trip", symbolization: {}, layer: null, folders: [], layerConfigs: [] },
        new Uint8Array([1, 2, 3]),
      );
    }).pipe(Effect.provide(AtprotoRepoLive(client)));

    await Effect.runPromise(program);

    const uploadCall = calls.find((call) => call.nsid === "com.atproto.repo.uploadBlob");
    expect(uploadCall?.args).toMatchObject({ input: expect.any(Blob) });
    const uploadArgs = uploadCall?.args;
    const uploadInput =
      uploadArgs && typeof uploadArgs === "object" && "input" in uploadArgs
        ? uploadArgs.input
        : undefined;
    if (!(uploadInput instanceof Blob)) {
      throw new Error("expected uploadBlob to be called with a Blob input");
    }
    expect(uploadInput.type).toBe("application/flatgeobuf");

    const putCall = calls.find((call) => call.nsid === "com.atproto.repo.putRecord");
    expect(putCall?.args).toMatchObject({
      input: {
        repo: "did:plc:abc",
        collection: COLLECTION,
        rkey: "3a",
        record: {
          name: "Trip",
          data: { $type: "blob", ref: "fake-ref" },
          symbolization: "{}",
          folders: "[]",
          layerConfigs: "[]",
        },
      },
    });
    // `layer: null` in, no `layer` key out: Lexicon has no null, and the
    // lexicon's `unknown` validator rejects one.
    expect(writtenRecord(putCall?.args)).not.toHaveProperty("layer");
  });

  it("writes a layer key when the map has one", async () => {
    const { client, calls } = fakeClient({
      "com.atproto.repo.uploadBlob": { blob: { $type: "blob", ref: "fake-ref" } },
      "com.atproto.repo.putRecord": { uri: "at://did:plc:abc/io.placemark.map/3a", cid: "bafy2" },
    });

    const program = Effect.gen(function* () {
      const repo = yield* AtprotoRepo;
      return yield* repo.putMap(
        "did:plc:abc",
        "3a",
        {
          name: "Trip",
          symbolization: {},
          layer: { name: "Monochrome" },
          folders: [],
          layerConfigs: [],
        },
        new Uint8Array([1, 2, 3]),
      );
    }).pipe(Effect.provide(AtprotoRepoLive(client)));

    await Effect.runPromise(program);

    const putCall = calls.find((call) => call.nsid === "com.atproto.repo.putRecord");
    expect(writtenRecord(putCall?.args)).toMatchObject({
      layer: JSON.stringify({ name: "Monochrome" }),
    });
  });

  it("deletes a map record", async () => {
    const { client, calls } = fakeClient({
      "com.atproto.repo.deleteRecord": {},
    });

    const program = Effect.gen(function* () {
      const repo = yield* AtprotoRepo;
      return yield* repo.deleteMap("did:plc:abc", "3a");
    }).pipe(Effect.provide(AtprotoRepoLive(client)));

    await Effect.runPromise(program);

    expect(calls[0]).toMatchObject({
      nsid: "com.atproto.repo.deleteRecord",
      args: { input: { repo: "did:plc:abc", collection: COLLECTION, rkey: "3a" } },
    });
  });
});
