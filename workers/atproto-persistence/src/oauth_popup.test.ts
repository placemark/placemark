import { expect, it } from "vitest";
import { parseOrigin, popupResultResponse, resolveReturnToOrigin } from "./oauth_popup";

it.for([
  ["https://app.placemark.io", "https://app.placemark.io"],
  ["https://app.placemark.io/some/path?q=1", "https://app.placemark.io"],
  ["http://localhost:5173", "http://localhost:5173"],
] as Array<[string, string]>)("parseOrigin canonicalizes %s", ([input, expected]) => {
  expect(parseOrigin(input)).toBe(expected);
});

it.for(["null", "", "/", "javascript:alert(1)", "file:///etc/passwd"])(
  "parseOrigin rejects %s",
  (input) => {
    expect(parseOrigin(input)).toBeNull();
  },
);

it.for([
  ["reads the returnTo origin", { returnTo: "https://app.placemark.io" }, "https://app.placemark.io"],
  ["rejects missing state", undefined, null],
  ["rejects null state", null, null],
  ["rejects state with no returnTo", {}, null],
  ["rejects a non-origin returnTo", { returnTo: "/" }, null],
  ["rejects a non-string returnTo", { returnTo: 42 }, null],
  ["rejects a plain-string state", "https://app.placemark.io", null],
] as Array<[string, unknown, string | null]>)("resolveReturnToOrigin %s", ([, state, expected]) => {
  expect(resolveReturnToOrigin(state)).toBe(expected);
});

it("serves a self-closing page that posts the payload to a concrete origin", async () => {
  const response = popupResultResponse(
    { type: "placemark-oauth-complete" },
    "https://app.placemark.io",
    { "Set-Cookie": "pm_session=abc; HttpOnly" },
  );

  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
  expect(response.headers.get("set-cookie")).toBe("pm_session=abc; HttpOnly");

  const body = await response.text();
  expect(body).toContain(
    'window.opener.postMessage({"type":"placemark-oauth-complete"}, "https://app.placemark.io")',
  );
  expect(body).toContain("window.close()");
  // A wildcard target would let any page that got hold of
  // `window.opener` observe the message.
  expect(body).not.toContain('"*"');
});

it("carries an error message for the failure path", async () => {
  const body = await popupResultResponse(
    { type: "placemark-oauth-error", message: "Sign-in was declined." },
    "https://app.placemark.io",
  ).text();

  expect(body).toContain('"type":"placemark-oauth-error"');
  expect(body).toContain('"message":"Sign-in was declined."');
});

it("escapes '<' so a payload can never break out of the script element", async () => {
  const body = await popupResultResponse(
    { type: "placemark-oauth-error", message: "</script><img src=x>" },
    "https://app.placemark.io",
  ).text();

  expect(body).not.toContain("</script><img");
  expect(body).toContain("\\u003c/script>");
  // The only real `</script>` is the one closing the inline script.
  expect(body.match(/<\/script>/g)).toHaveLength(1);
});
