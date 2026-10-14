import { Result } from "effect";
import { Base64Url } from "effect/encoding";

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
