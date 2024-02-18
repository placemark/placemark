interface Env {
  APP_BUILD: R2Bucket;
}

function hasBody(object: R2Object | R2ObjectBody): object is R2ObjectBody {
  return (<R2ObjectBody>object).body !== undefined;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const allowedMethods = ["GET", "HEAD", "OPTIONS"];
    if (allowedMethods.indexOf(request.method) === -1)
      return new Response("Method Not Allowed", { status: 405 });

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "access-control-allow-origin": "*",
          "access-control-max-age": "86400",
          allow: allowedMethods.join(", "),
        },
      });
    }

    const url = new URL(request.url);
    if (url.pathname === "/") {
      return new Response("OK");
    }

    let response: Response | undefined;

    const isCachingEnabled = true;
    const cache = caches.default;
    if (isCachingEnabled) {
      response = await cache.match(request);
    }

    if (!response || !(response.ok || response.status == 304)) {
      console.warn("Cache miss");
      let path = decodeURIComponent(url.pathname.substring(1));

      let file: R2Object | R2ObjectBody | null | undefined;

      // Etag/If-(Not)-Match handling
      // R2 requires that etag checks must not contain quotes, and the S3 spec only allows one etag
      // This silently ignores invalid or weak (W/) headers
      const getHeaderEtag = (header: string | null) =>
        header?.trim().replace(/^['"]|['"]$/g, "");
      const ifMatch = getHeaderEtag(request.headers.get("if-match"));
      const ifNoneMatch = getHeaderEtag(request.headers.get("if-none-match"));

      const ifModifiedSince = Date.parse(
        request.headers.get("if-modified-since") || ""
      );
      const ifUnmodifiedSince = Date.parse(
        request.headers.get("if-unmodified-since") || ""
      );

      if (ifMatch || ifUnmodifiedSince) {
        file = await env.APP_BUILD.get(path, {
          onlyIf: {
            etagMatches: ifMatch,
            uploadedBefore: ifUnmodifiedSince
              ? new Date(ifUnmodifiedSince)
              : undefined,
          },
        });

        if (file && !hasBody(file)) {
          return new Response("Precondition Failed", { status: 412 });
        }
      }

      if (ifNoneMatch || ifModifiedSince) {
        // if-none-match overrides if-modified-since completely
        if (ifNoneMatch) {
          file = await env.APP_BUILD.get(path, {
            onlyIf: { etagDoesNotMatch: ifNoneMatch },
          });
        } else if (ifModifiedSince) {
          file = await env.APP_BUILD.get(path, {
            onlyIf: { uploadedAfter: new Date(ifModifiedSince) },
          });
        }
        if (file && !hasBody(file)) {
          return new Response(null, { status: 304 });
        }
      }

      file =
        request.method === "HEAD"
          ? await env.APP_BUILD.head(path)
          : file && hasBody(file)
          ? file
          : await env.APP_BUILD.get(path);

      let notFound: boolean = false;

      if (file === null) {
        // if its still null, either 404 is disabled or that file wasn't found either
        // this isn't an else because then there would have to be two of theem
        if (file == null) {
          return new Response("File Not Found", { status: 404 });
        }
      }

      response = new Response(
        hasBody(file) && file.size !== 0 ? file.body : null,
        {
          status: notFound ? 404 : 200,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-max-age": "86400",

            etag: notFound ? "" : file.httpEtag,
            // if the 404 file has a custom cache control, we respect it
            "cache-control":
              file.httpMetadata?.cacheControl ??
              (notFound ? "" : "max-age=604800"),
            expires: file.httpMetadata?.cacheExpiry?.toUTCString() ?? "",
            "last-modified": notFound ? "" : file.uploaded.toUTCString(),

            "content-encoding": file.httpMetadata?.contentEncoding ?? "",
            "content-type":
              file.httpMetadata?.contentType ?? "application/octet-stream",
            "content-language": file.httpMetadata?.contentLanguage ?? "",
            "content-disposition": file.httpMetadata?.contentDisposition ?? "",
            "content-length": file.size.toString(),
          },
        }
      );

      if (request.method === "GET" && isCachingEnabled && !notFound)
        ctx.waitUntil(cache.put(request, response.clone()));
    }

    return response;
  },
};
