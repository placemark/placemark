import { expect, it } from "vitest";
import { signDidCookie, verifyDidCookie } from "./cookie";

const secret = "test-secret";

it("round-trips a signed DID", async () => {
  const cookie = await signDidCookie("did:plc:abc123", secret);
  expect(await verifyDidCookie(cookie, secret)).toBe("did:plc:abc123");
});

it.for([
  ["a tampered DID", (cookie: string) => `did:plc:evil.${cookie.split(".").at(-1)}`],
  ["a tampered signature", (cookie: string) => `${cookie}x`],
  ["a value with no signature", () => "not-a-valid-cookie"],
] as Array<[string, (cookie: string) => string]>)("rejects %s", async ([, tamper]) => {
  const cookie = await signDidCookie("did:plc:abc123", secret);
  expect(await verifyDidCookie(tamper(cookie), secret)).toBeNull();
});

it("rejects a cookie signed with a different secret", async () => {
  const cookie = await signDidCookie("did:plc:abc123", secret);
  expect(await verifyDidCookie(cookie, "other-secret")).toBeNull();
});
