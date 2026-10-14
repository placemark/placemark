import { describe, expect, it } from "vitest";
import { signDidCookie, verifyDidCookie } from "./cookie";

describe("signed DID cookie", () => {
  const secret = "test-secret";

  it("round-trips a valid cookie", async () => {
    const cookie = await signDidCookie("did:plc:abc123", secret);
    const did = await verifyDidCookie(cookie, secret);
    expect(did).toBe("did:plc:abc123");
  });

  it("rejects a tampered DID", async () => {
    const cookie = await signDidCookie("did:plc:abc123", secret);
    const [, signature] = cookie.split(".");
    const tampered = `did:plc:evil.${signature}`;
    expect(await verifyDidCookie(tampered, secret)).toBeNull();
  });

  it("rejects a tampered signature", async () => {
    const cookie = await signDidCookie("did:plc:abc123", secret);
    const tampered = `${cookie}x`;
    expect(await verifyDidCookie(tampered, secret)).toBeNull();
  });

  it("rejects a cookie signed with a different secret", async () => {
    const cookie = await signDidCookie("did:plc:abc123", secret);
    expect(await verifyDidCookie(cookie, "other-secret")).toBeNull();
  });

  it("rejects a malformed cookie", async () => {
    expect(await verifyDidCookie("not-a-valid-cookie", secret)).toBeNull();
  });
});
