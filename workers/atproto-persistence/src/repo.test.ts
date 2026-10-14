import { expect, it, vi } from "vitest";
import { Effect } from "effect";
import type { Client } from "@atcute/client";
import { AtprotoRepo, AtprotoRepoLive, type AtprotoRepoShape } from "./repo";
import { CloudMapSummary, RecordNotFound } from "../../../shared/atproto_rpc";

const COLLECTION = "io.placemark.map";
const BLOB_CID = `bafyrei${"a".repeat(52)}`;

const PUT_RESPONSES = {
  "com.atproto.repo.uploadBlob": { blob: { $type: "blob", ref: "fake-ref" } },
  "com.atproto.repo.putRecord": { uri: "at://did:plc:abc/io.placemark.map/3a", cid: "bafy2" },
};

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
function writtenRecord(args: unknown): Record<string, unknown> {
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
  return args.input.record as Record<string, unknown>;
}

/** A well-formed `io.placemark.map` record as getRecord would return it. */
function mapRecord(value: Record<string, unknown> = {}) {
  return {
    uri: "at://did:plc:abc/io.placemark.map/3a",
    cid: "bafy1",
    value: {
      name: "Trip",
      updatedAt: "2026-10-07T00:00:00.000Z",
      data: { $type: "blob", ref: { $link: BLOB_CID }, mimeType: "application/flatgeobuf", size: 3 },
      symbolization: "{}",
      folders: "[]",
      layerConfigs: "[]",
      ...value,
    },
  };
}

function repoEffect<A>(client: Client, f: (repo: AtprotoRepoShape) => Effect.Effect<A, unknown>) {
  return Effect.gen(function* () {
    const repo = yield* AtprotoRepo;
    return yield* f(repo);
  }).pipe(Effect.provide(AtprotoRepoLive(client)));
}

const withRepo = <A>(client: Client, f: (repo: AtprotoRepoShape) => Effect.Effect<A, unknown>) =>
  Effect.runPromise(repoEffect(client, f));

const withRepoError = <A>(client: Client, f: (repo: AtprotoRepoShape) => Effect.Effect<A, unknown>) =>
  Effect.runPromise(Effect.flip(repoEffect(client, f)));

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

  const result = await withRepo(client, (repo) => repo.listMaps("did:plc:abc"));

  expect(result).toStrictEqual([
    new CloudMapSummary({ rkey: "3a", name: "Trip", updatedAt: "2026-10-07T00:00:00.000Z" }),
  ]);
  expect(calls[0]).toMatchObject({
    nsid: "com.atproto.repo.listRecords",
    args: { params: { repo: "did:plc:abc", collection: COLLECTION } },
  });
});

it.for(
  [
    ["normalizes an absent layer to null", mapRecord(), null],
    [
      "keeps a layer that is present",
      mapRecord({ layer: JSON.stringify({ name: "Monochrome" }) }),
      { name: "Monochrome" },
    ],
  ] as Array<[string, unknown, unknown]>,
)("getMap %s", async ([, record, expectedLayer]) => {
  const { client, calls } = fakeClient({
    "com.atproto.repo.getRecord": record,
    "com.atproto.sync.getBlob": new Uint8Array([9, 9, 9]),
  });

  const result = await withRepo(client, (repo) => repo.getMap("did:plc:abc", "3a"));

  expect(result.layer).toStrictEqual(expectedLayer);
  expect(result).toMatchObject({ name: "Trip", symbolization: {}, folders: [], layerConfigs: [] });
  expect(result.dataBytes).toStrictEqual(new Uint8Array([9, 9, 9]));
  // The bytes live on the PDS, behind the CID the record only points at.
  expect(calls.find((call) => call.nsid === "com.atproto.sync.getBlob")).toMatchObject({
    args: { params: { did: "did:plc:abc", cid: BLOB_CID }, as: "bytes" },
  });
});

it.for(["getMap", "getMapSummary"] as const)(
  "%s fails with RecordNotFound on an XRPC error",
  async (method) => {
    const client = {
      post: vi.fn(),
      get: vi.fn(async () => ({ ok: false, data: { error: "RecordNotFound" } })),
    } as unknown as Client;

    const error = await withRepoError(client, (repo) => repo[method]("did:plc:abc", "missing"));

    expect(error).toStrictEqual(new RecordNotFound({ rkey: "missing" }));
  },
);

it("getMapSummary skips the blob round trip", async () => {
  const { client, calls } = fakeClient({ "com.atproto.repo.getRecord": mapRecord() });

  const result = await withRepo(client, (repo) => repo.getMapSummary("did:plc:abc", "3a"));

  expect(result).toStrictEqual({ name: "Trip" });
  expect(calls).toHaveLength(1);
});

it.for(
  [
    [
      "omits the layer key when the map has no base layer",
      null,
      undefined,
    ],
    [
      "writes a JSON-encoded layer key when the map has one",
      { name: "Monochrome" },
      JSON.stringify({ name: "Monochrome" }),
    ],
  ] as Array<[string, unknown, string | undefined]>,
)("putMap %s", async ([, layer, expected]) => {
  const { client, calls } = fakeClient(PUT_RESPONSES);

  await withRepo(client, (repo) =>
    repo.putMap(
      "did:plc:abc",
      "3a",
      { name: "Trip", symbolization: {}, layer, folders: [], layerConfigs: [] },
      new Uint8Array([1, 2, 3]),
    ),
  );

  // A Blob with its type set: atcute infers the upload's content-type
  // header from the Blob, not from the XRPC call itself.
  const uploadInput = (
    calls.find((call) => call.nsid === "com.atproto.repo.uploadBlob")?.args as { input: Blob }
  ).input;
  expect(uploadInput).toBeInstanceOf(Blob);
  expect(uploadInput.type).toBe("application/flatgeobuf");

  const record = writtenRecord(calls.find((call) => call.nsid === "com.atproto.repo.putRecord")?.args);
  expect(record).toMatchObject({
    name: "Trip",
    data: { $type: "blob", ref: "fake-ref" },
    symbolization: "{}",
    folders: "[]",
    layerConfigs: "[]",
  });
  if (expected === undefined) {
    // Lexicon has no null; absence IS "no base layer".
    expect(record).not.toHaveProperty("layer");
  } else {
    expect(record.layer).toBe(expected);
  }
});

it("deletes a map record", async () => {
  const { client, calls } = fakeClient({ "com.atproto.repo.deleteRecord": {} });

  await withRepo(client, (repo) => repo.deleteMap("did:plc:abc", "3a"));

  expect(calls[0]).toMatchObject({
    nsid: "com.atproto.repo.deleteRecord",
    args: { input: { repo: "did:plc:abc", collection: COLLECTION, rkey: "3a" } },
  });
});
