import { Result } from "effect";
import { Base64Url } from "effect/encoding";

export const SESSION_COOKIE_NAME = "pm_session";

const SESSION_COOKIE_ATTRS = "HttpOnly; Secure; SameSite=Lax; Path=/";

export function sessionSetCookie(cookieValue: string): string {
  return `${SESSION_COOKIE_NAME}=${cookieValue}; ${SESSION_COOKIE_ATTRS}`;
}

export function sessionClearCookie(): string {
  return `${SESSION_COOKIE_NAME}=; ${SESSION_COOKIE_ATTRS}; Max-Age=0`;
}

/** Reads the raw (unverified) session cookie value straight off a Request. */
export function readSessionCookie(request: Request): string | null {
  const header = request.headers.get("Cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const separatorIndex = part.indexOf("=");
    if (separatorIndex === -1) continue;
    const name = part.slice(0, separatorIndex).trim();
    if (name === SESSION_COOKIE_NAME) {
      return part.slice(separatorIndex + 1).trim();
    }
  }
  return null;
}

const encoder = new TextEncoder();

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signDidCookie(did: string, secret: string): Promise<string> {
  const key = await hmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(did));
  return `${did}.${Base64Url.encode(new Uint8Array(signature))}`;
}

export async function verifyDidCookie(
  cookieValue: string,
  secret: string,
): Promise<string | null> {
  const separatorIndex = cookieValue.lastIndexOf(".");
  if (separatorIndex === -1) {
    return null;
  }
  const did = cookieValue.slice(0, separatorIndex);
  const signature = cookieValue.slice(separatorIndex + 1);

  const decoded = Base64Url.decode(signature);
  if (Result.isFailure(decoded)) {
    return null;
  }
  const signatureBytes = decoded.success;

  const key = await hmacKey(secret);
  const valid = await crypto.subtle.verify("HMAC", key, signatureBytes, encoder.encode(did));
  return valid ? did : null;
}
