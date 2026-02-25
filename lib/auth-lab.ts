/**
 * Simple lab auth: sign/verify session token for cookie.
 * Uses Web Crypto so it works in both Node (API routes) and Edge (middleware).
 */

const COOKIE_NAME = "lab_session";
const PAYLOAD_SEP = ".";

async function getKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function base64UrlEncode(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return btoa(String.fromCharCode(...u8))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = str.length % 4;
  if (pad) str += "=".repeat(4 - pad);
  return new Uint8Array(
    atob(str)
      .split("")
      .map((c) => c.charCodeAt(0))
  );
}

export async function createLabSession(secret: string): Promise<string> {
  const payload = JSON.stringify({ t: Date.now() });
  const key = await getKey(secret);
  const encoder = new TextEncoder();
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload)
  );
  const payloadB64 = base64UrlEncode(encoder.encode(payload));
  const sigB64 = base64UrlEncode(sig);
  return `${payloadB64}${PAYLOAD_SEP}${sigB64}`;
}

export async function verifyLabSession(
  secret: string,
  token: string
): Promise<boolean> {
  const sep = token.indexOf(PAYLOAD_SEP);
  if (sep === -1) return false;
  const payloadB64 = token.slice(0, sep);
  const sigB64 = token.slice(sep + 1);
  if (!payloadB64 || !sigB64) return false;
  try {
    const payloadBytes = base64UrlDecode(payloadB64);
    const payload = new TextDecoder().decode(payloadBytes);
    const sig = base64UrlDecode(sigB64);
    const key = await getKey(secret);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      sig as BufferSource,
      new TextEncoder().encode(payload)
    );
    if (!valid) return false;
    const data = JSON.parse(payload) as { t?: number };
    const age = data.t ? Date.now() - data.t : 0;
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    return age >= 0 && age <= maxAge;
  } catch {
    return false;
  }
}

export { COOKIE_NAME };
