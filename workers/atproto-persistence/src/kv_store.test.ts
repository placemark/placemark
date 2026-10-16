import { expect, it } from "vitest";
import { makeKVStore } from "./kv_store";

function fakeKVNamespace() {
  const data = new Map<string, string>();
  const putOptions: Array<unknown> = [];
  return {
    putOptions,
    namespace: {
      async get(key: string, type?: string) {
        const raw = data.get(key);
        if (raw === undefined) return null;
        return type === "json" ? JSON.parse(raw) : raw;
      },
      async put(key: string, value: string, options?: unknown) {
        putOptions.push(options);
        data.set(key, value);
      },
      async delete(key: string) {
        data.delete(key);
      },
    } as unknown as KVNamespace,
  };
}

it("returns undefined for a missing key", async () => {
  const { namespace } = fakeKVNamespace();
  expect(await makeKVStore(namespace).get("missing")).toBeUndefined();
});

it("round-trips a JSON-serializable value and deletes it", async () => {
  const { namespace } = fakeKVNamespace();
  const store = makeKVStore<{ hello: string }>(namespace);
  await store.set("key", { hello: "world" });
  expect(await store.get("key")).toStrictEqual({ hello: "world" });
  await store.delete("key");
  expect(await store.get("key")).toBeUndefined();
});

it.for([
  ["passes expirationTtl when a ttl is configured", { ttlSeconds: 600 }, { expirationTtl: 600 }],
  ["omits the options argument without a ttl", undefined, undefined],
] as Array<[string, { ttlSeconds: number } | undefined, unknown]>)("put %s", async ([, options, expected]) => {
  const { namespace, putOptions } = fakeKVNamespace();
  await makeKVStore<number>(namespace, options).set("key", 1);
  expect(putOptions[0]).toStrictEqual(expected);
});
