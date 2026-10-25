// The OAuth leg runs in a popup (see client.ts), so the callback must not
// redirect anywhere visible -- it serves a page that posts the outcome to
// the opener and closes itself.

type PopupPayload =
  | { type: "placemark-oauth-complete" }
  | { type: "placemark-oauth-error"; message: string };

function jsLiteral(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function parseOrigin(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return null;
  }
  return url.origin;
}

// Recovers the frontend origin handleLogin threaded through as state.returnTo.
export function resolveReturnToOrigin(state: unknown): string | null {
  if (typeof state !== "object" || state === null || !("returnTo" in state)) {
    return null;
  }
  const returnTo = state.returnTo;
  if (typeof returnTo !== "string") {
    return null;
  }
  return parseOrigin(returnTo);
}

export function popupResultResponse(
  payload: PopupPayload,
  targetOrigin: string,
  extraHeaders: Record<string, string> = {},
): Response {
  const body = `<!doctype html>
<meta charset="utf-8">
<title>Signing in</title>
<script>
(function () {
  if (window.opener) {
    window.opener.postMessage(${jsLiteral(payload)}, ${jsLiteral(targetOrigin)});
  }
  // A brief delay, not an immediate close: postMessage delivery is
  // queued asynchronously, and closing too eagerly can let the opener's
  // "did the user just close the popup?" check race ahead of it.
  setTimeout(function () { window.close(); }, 100);
})();
</script>
`;
  return new Response(body, {
    status: 200,
    headers: {
      ...extraHeaders,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
