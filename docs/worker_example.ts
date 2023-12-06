/**
 * This is an example of a Cloudflare worker that proxies
 * from ws.yourdomain.com to yourdomain.com, and requires
 * requests to be under the `/api/v1` route.
 *
 * This is to allow domain isolation between the main app
 * and the API, so that the API doesn't accidentally inherit cookies,
 * and the API can have its own caching rules.
 */
addEventListener("fetch", (event) => {
  event.respondWith(
    handleRequest(event).catch(
      (err) => new Response(err.stack, { status: 500 }),
    ),
  );
});

/**
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function handleRequest(event) {
  const request = event.request;

  if (request.method == "OPTIONS") {
    const response = new Response("", { status: 200 });
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Max-Age", "86400");
    return response;
  }

  if (request.method !== "GET") {
    return new Response("Invalid method", { status: 405 });
  }

  const cacheUrl = new URL(request.url);

  // Construct the cache key from the cache URL
  const cacheKey = new Request(cacheUrl.toString(), request);
  const cache = caches.default;

  const { pathname, search } = new URL(request.url);
  if (!pathname.startsWith("/api/v1")) {
    return new Response(`Invalid request`, { status: 404 });
  }

  let response = await cache.match(request);

  if (!response) {
    console.log("not cached");
    const apiUrl = `https://your.placemark.server.com${pathname}${search}`;
    const originRequest = new Request(apiUrl, request);
    originRequest.headers.set("Origin", new URL(apiUrl).origin);
    response = await fetch(originRequest, {
      cf: {
        // Always cache this fetch regardless of content type
        // for a max of 5 seconds before revalidating the resource
        cacheTtl: 20,
        cacheEverything: true,
      },
    });

    // Reconstruct the Response object to make its headers mutable.
    response = new Response(response.body, response);

    // Set cache control headers to cache on browser for 25 minutes
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Max-Age", "86400");
    response.headers.set(
      "Cache-Control",
      "max-age=30, stale-while-revalidate=60",
    );

    event.waitUntil(cache.put(cacheKey, response.clone()));
  } else {
    console.log("found in cache");
  }
  return response;
}
