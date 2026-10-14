// Workers' fetch() doesn't support RequestInit.cache: "no-cache" (used by
// @atcute/oauth-node-client and @atcute/identity-resolver for a fresh
// fetch), throwing instead of falling back. Translate it to "no-store",
// the closest mode Workers does support. Imported once for this side effect.
const UNSUPPORTED_CACHE_MODES: ReadonlySet<string> = new Set([
  "no-cache",
  "reload",
  "force-cache",
  "only-if-cached",
]);

export function sanitizeCacheMode(cache: unknown): string | undefined {
  if (typeof cache !== "string") {
    return undefined;
  }
  return UNSUPPORTED_CACHE_MODES.has(cache) ? "no-store" : cache;
}

// @cloudflare/workers-types' RequestInit doesn't declare `cache` at all,
// even though the runtime accepts and validates it -- bridge that gap here.
interface RequestInitWithCache extends RequestInit {
  cache?: string;
}

function cacheModeOf(input: RequestInfo | URL, init: RequestInitWithCache | undefined): unknown {
  if (init?.cache !== undefined) {
    return init.cache;
  }
  if (input instanceof Request) {
    return (input as Request & { cache?: unknown }).cache;
  }
  return undefined;
}

const originalFetch = globalThis.fetch;

export function patchedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const initWithCache = init as RequestInitWithCache | undefined;
  const requestCache = cacheModeOf(input, initWithCache);
  const sanitized = sanitizeCacheMode(requestCache);
  if (sanitized === requestCache) {
    return originalFetch(input, init);
  }
  const patchedInit: RequestInitWithCache = { ...initWithCache, cache: sanitized };
  return originalFetch(input, patchedInit as RequestInit);
}

globalThis.fetch = patchedFetch as typeof fetch;
