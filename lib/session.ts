export const COOKIE_NAME = "session";
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000;

function b64url(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function fromB64url(str: string): string {
  return atob(str.replace(/-/g, "+").replace(/_/g, "/"));
}

async function getKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(process.env.AUTH_SECRET!),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signSession(payload: { email: string; name: string }): Promise<string> {
  const data = b64url(JSON.stringify({ ...payload, exp: Date.now() + SESSION_DURATION }));
  const key = await getKey();
  const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  const sig = b64url(String.fromCharCode(...new Uint8Array(sigBuf)));
  return `${data}.${sig}`;
}

export async function verifySession(token: string): Promise<{ email: string; name: string } | null> {
  try {
    const dot = token.lastIndexOf(".");
    if (dot === -1) return null;
    const data = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    const key = await getKey();
    const sigBytes = Uint8Array.from(fromB64url(sig), (c) => c.charCodeAt(0));
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(data));
    if (!valid) return null;
    const parsed = JSON.parse(fromB64url(data));
    if (parsed.exp < Date.now()) return null;
    return { email: parsed.email, name: parsed.name };
  } catch {
    return null;
  }
}
