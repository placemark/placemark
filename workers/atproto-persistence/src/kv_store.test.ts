import { describe, expect, it } from "vitest";
import { makeKVStore } from "./kv_store";

function fakeKVNamespace(): KVNamespace {
  const data = new Map<string, string>();
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const namespace = {
    async get(key: string, type?: string) {
      calls.push({ method: "get", args: [key, type] });
      const raw = data.get(key);
      if (raw === undefined) return null;
      return type === "json" ? JSON.parse(raw) : raw;
    },
    async put(key: string, value: string, options?: unknown) {
      calls.push({ method: "put", args: [key, value, options] });
      data.set(key, value);
    },
    async delete(key: string) {
      calls.push({ method: "delete", args: [key] });
      data.delete(key);
    },
  } as unknown as KVNamespace;
  return Object.assign(namespace, { __calls: calls });
}

describe("makeKVStore", () => {
  it("returns undefined for a missing key", async () => {
    const store = makeKVStore(fakeKVNamespace());
    expect(await store.get("missing")).toBeUndefined();
  });

  it("round-trips a JSON-serializable value", async () => {
    const store = makeKVStore<{ hello: string }>(fakeKVNamespace());
    await store.set("key", { hello: "world" });
    expect(await store.get("key")).toStrictEqual({ hello: "world" });
  });

  it("deletes a value", async () => {
    const store = makeKVStore<number>(fakeKVNamespace());
    await store.set("key", 1);
    await store.delete("key");
    expect(await store.get("key")).toBeUndefined();
  });

  it("passes an expirationTtl option when configured", async () => {
    const namespace = fakeKVNamespace();
    const store = makeKVStore<number>(namespace, { ttlSeconds: 600 });
    await store.set("key", 1);
    const calls = (namespace as unknown as { __calls: Array<{ method: string; args: unknown[] }> })
      .__calls;
    const putCall = calls.find((call) => call.method === "put");
    expect(putCall?.args[2]).toStrictEqual({ expirationTtl: 600 });
  });

  it("omits the options argument entirely when no ttl is configured", async () => {
    const namespace = fakeKVNamespace();
    const store = makeKVStore<number>(namespace);
    await store.set("key", 1);
    const calls = (namespace as unknown as { __calls: Array<{ method: string; args: unknown[] }> })
      .__calls;
    const putCall = calls.find((call) => call.method === "put");
    expect(putCall?.args[2]).toBeUndefined();
  });
});
