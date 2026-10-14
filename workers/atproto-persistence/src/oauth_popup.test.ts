import { describe, expect, it } from "vitest";
import { parseOrigin, popupResultResponse, resolveReturnToOrigin } from "./oauth_popup";

describe("parseOrigin", () => {
  it("canonicalizes http(s) origins", () => {
    expect(parseOrigin("https://app.placemark.io")).toBe("https://app.placemark.io");
    expect(parseOrigin("https://app.placemark.io/some/path?q=1")).toBe(
      "https://app.placemark.io",
    );
    expect(parseOrigin("http://localhost:5173")).toBe("http://localhost:5173");
  });

  it("rejects anything that is not an http(s) origin", () => {
    expect(parseOrigin("null")).toBeNull();
    expect(parseOrigin("")).toBeNull();
    expect(parseOrigin("/")).toBeNull();
    expect(parseOrigin("javascript:alert(1)")).toBeNull();
    expect(parseOrigin("file:///etc/passwd")).toBeNull();
  });
});

describe("resolveReturnToOrigin", () => {
  it("reads the origin threaded through OAuth state", () => {
    expect(resolveReturnToOrigin({ returnTo: "https://app.placemark.io" })).toBe(
      "https://app.placemark.io",
    );
  });

  it("returns null for missing or malformed state", () => {
    expect(resolveReturnToOrigin(undefined)).toBeNull();
    expect(resolveReturnToOrigin(null)).toBeNull();
    expect(resolveReturnToOrigin({})).toBeNull();
    expect(resolveReturnToOrigin({ returnTo: "/" })).toBeNull();
    expect(resolveReturnToOrigin({ returnTo: 42 })).toBeNull();
    expect(resolveReturnToOrigin("https://app.placemark.io")).toBeNull();
  });
});

describe("popupResultResponse", () => {
  it("posts the payload to a concrete origin and closes itself", async () => {
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

  it("carries an error payload for the failure path", async () => {
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
});
