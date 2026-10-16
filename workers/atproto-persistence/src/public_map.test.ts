import { expect, it, vi } from "vitest";
import type { ActorResolver, ResolvedActor } from "@atcute/identity-resolver";
import { RecordNotFound } from "../../../shared/atproto_rpc";
import { fetchSharedMap, handlePublicMap, parsePublicMapParams } from "./public_map";

const BLOB_CID = `bafyrei${"a".repeat(52)}`;

/** A well-formed `io.placemark.map` record as getRecord would return it. */
function mapRecord() {
  return {
    uri: "at://did:plc:abc/io.placemark.map/3a",
    cid: "bafy1",
    value: {
      name: "Trip",
      updatedAt: "2026-10-07T00:00:00.000Z",
      data: {
        $type: "blob",
        ref: { $link: BLOB_CID },
        mimeType: "application/flatgeobuf",
        size: 3,
      },
      symbolization: "{}",
      folders: "[]",
      layerConfigs: "[]",
    },
  };
}

/**
 * Stubs global fetch with a fake PDS answering the XRPC endpoints in
 * `responses` (simpleFetchHandler defaults to the ambient fetch at
 * handler-construction time, i.e. inside fetchSharedMap).
 */
function stubPds(responses: Record<string, unknown>) {
  const calls: string[] = [];
  const fetchMock = vi.fn(async (href: string) => {
    calls.push(href);
    const nsid = new URL(href).pathname.split("/").pop() ?? "";
    const data = responses[nsid];
    if (data === undefined) {
      return Response.json({ error: "UnknownNsId" }, { status: 400 });
    }
    if (data instanceof Uint8Array) {
      return new Response(data, {
        headers: { "content-type": "application/flatgeobuf" },
      });
    }
    return Response.json(data);
  });
  vi.stubGlobal("fetch", fetchMock);
  return { calls, fetchMock };
}

function fakeResolver(pds = "https://pds.test"): ActorResolver {
  return {
    resolve: vi.fn(
      async () =>
        ({ did: "did:plc:abc", handle: "teal.test", pds }) as ResolvedActor,
    ),
  };
}

const PARAMS = { did: "did:plc:abc", rkey: "3a" };

it("fetchSharedMap resolves the DID to a PDS and reads the record unauthenticated", async () => {
  const resolver = fakeResolver();
  const { calls } = stubPds({
    "com.atproto.repo.getRecord": mapRecord(),
    "com.atproto.sync.getBlob": new Uint8Array([9, 9, 9]),
  });

  const shared = await fetchSharedMap(PARAMS, resolver);

  expect(resolver.resolve).toHaveBeenCalledWith("did:plc:abc");
  expect(shared.name).toBe("Trip");
  expect(shared.doc).toMatchObject({
    dataBase64: "CQkJ",
    symbolization: {},
    layer: null,
    folders: [],
    layerConfigs: [],
  });
  // Both XRPC calls go to the resolved PDS.
  expect(calls[0].startsWith("https://pds.test/xrpc/")).toBe(true);
});

it("fetchSharedMap fails with RecordNotFound when the record is gone", async () => {
  stubPds({ "com.atproto.repo.getRecord": { error: "RecordNotFound" } });

  await expect(fetchSharedMap(PARAMS, fakeResolver())).rejects.toEqual(
    new RecordNotFound({ rkey: "3a" }),
  );
});

it.for([
  ["missing both", new URL("https://worker.test/public/map")],
  ["invalid did", new URL("https://worker.test/public/map?did=nope&rkey=3a")],
  [
    "invalid rkey",
    new URL(`https://worker.test/public/map?did=${PARAMS.did}&rkey=3a/nope`),
  ],
] as Array<[string, URL]>)("parsePublicMapParams rejects %s", ([, url]) => {
  expect(parsePublicMapParams(url)).toBeNull();
});

it("handlePublicMap returns 400 for invalid parameters", async () => {
  const response = await handlePublicMap(
    new Request("https://worker.test/public/map"),
    fakeResolver(),
  );

  expect(response.status).toBe(400);
});

it("handlePublicMap returns the SharedMap document with a short public cache", async () => {
  stubPds({
    "com.atproto.repo.getRecord": mapRecord(),
    "com.atproto.sync.getBlob": new Uint8Array([9, 9, 9]),
  });

  const response = await handlePublicMap(
    new Request(
      `https://worker.test/public/map?did=${PARAMS.did}&rkey=${PARAMS.rkey}`,
    ),
    fakeResolver(),
  );

  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("public, max-age=60");
  await expect(response.json()).resolves.toMatchObject({
    name: "Trip",
    doc: { dataBase64: "CQkJ", folders: [] },
  });
});

it("handlePublicMap returns 404 for a missing record", async () => {
  stubPds({
    "com.atproto.repo.getRecord": { error: "RecordNotFound" },
  });

  const response = await handlePublicMap(
    new Request(
      `https://worker.test/public/map?did=${PARAMS.did}&rkey=${PARAMS.rkey}`,
    ),
    fakeResolver(),
  );

  expect(response.status).toBe(404);
  await expect(response.json()).resolves.toEqual({ error: "RecordNotFound" });
});

it("handlePublicMap returns 502 when the DID does not resolve", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new Error("dns boom");
    }),
  );

  const response = await handlePublicMap(
    new Request(
      `https://worker.test/public/map?did=${PARAMS.did}&rkey=${PARAMS.rkey}`,
    ),
    // No resolver injected: the real one resolves over the network, and
    // the stubbed fetch makes every resolution attempt fail.
  );

  expect(response.status).toBe(502);
});
