export interface Store<K, V> {
  get(key: K, options?: { signal?: AbortSignal }): Promise<V | undefined>;
  set(key: K, value: V): Promise<void>;
  delete(key: K): Promise<void>;
  clear(): Promise<void>;
}

export function makeKVStore<V>(
  namespace: KVNamespace,
  options?: { ttlSeconds?: number },
): Store<string, V> {
  return {
    async get(key) {
      const value = await namespace.get<V>(key, "json");
      return value ?? undefined;
    },
    async set(key, value) {
      await namespace.put(
        key,
        JSON.stringify(value),
        options?.ttlSeconds ? { expirationTtl: options.ttlSeconds } : undefined,
      );
    },
    async delete(key) {
      await namespace.delete(key);
    },
    async clear() {
      // KV has no "delete everything under this binding" primitive, and
      // oauth-node-client never calls clear() during the login/session
      // flows this project uses, so this is intentionally a no-op.
    },
  };
}
