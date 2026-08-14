// The session cookie.
//
// WHY httpOnly AND ENCRYPTED. The thing we are storing is a Home-issued id_token — a bearer
// credential with no revocation. Put it in `localStorage` and every script on the page can read
// it; put it in a readable cookie and so can every script plus anything that can read a request
// log. So: AES-GCM sealed, `httpOnly`, `SameSite=Lax`, `Secure` off loopback only.
//
// WHAT IS NOT IN HERE. No stewardship delegations, no org list. Those are re-read from the Home
// per request (cached in-isolate for a minute), because a cookie is a snapshot and a revoked
// wire has to stop working now, not at the next sign-in.
//
// WHY NO KV/D1. This app deliberately stores nothing durable. A session that dies with the
// cookie is the correct blast radius for a credential we did not mint.

const COOKIE = 'commons_session';
const PENDING_COOKIE = 'commons_pending';

export interface SessionData {
  idToken: string;
  person: string;
  agentName: string | null;
  authOrigin: string;
  /** Unix seconds — the id_token's own `exp`, not a policy of ours. */
  exp: number;
}

/** The PKCE + state a connect flow must round-trip. Ten minutes, then it is gone. */
export interface PendingConnect {
  state: string;
  nonce: string;
  codeVerifier: string;
  authOrigin: string;
  template: 'site-login' | 'org-create';
}

async function keyFrom(secret: string): Promise<CryptoKey> {
  // The secret is a passphrase, not key material, so it gets hashed to 256 bits first. Raw-
  // importing a human-typed string would silently truncate or reject depending on its length.
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

function b64urlEncode(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function seal(value: unknown, secret: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await keyFrom(secret);
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(value))),
  );
  const joined = new Uint8Array(iv.length + ct.length);
  joined.set(iv);
  joined.set(ct, iv.length);
  return b64urlEncode(joined);
}

/** Returns null for anything that does not decrypt — a tampered cookie is simply not a session. */
export async function open<T>(sealed: string | undefined, secret: string): Promise<T | null> {
  if (!sealed) return null;
  try {
    const raw = b64urlDecode(sealed);
    const iv = raw.subarray(0, 12);
    const ct = raw.subarray(12);
    const key = await keyFrom(secret);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
    return JSON.parse(new TextDecoder().decode(pt)) as T;
  } catch {
    return null;
  }
}

function readCookie(header: string | null, name: string): string | undefined {
  for (const part of (header ?? '').split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return decodeURIComponent(rest.join('='));
  }
  return undefined;
}

const attrs = (secure: boolean, maxAge: number): string =>
  `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;

export function cookieHeaders(url: string) {
  // `Secure` breaks `http://localhost` dev, so it is set from the actual scheme rather than
  // from an env flag someone will forget to flip.
  const secure = new URL(url).protocol === 'https:';
  return {
    setSession: (sealed: string, ttlSeconds: number): string =>
      `${COOKIE}=${encodeURIComponent(sealed)}; ${attrs(secure, Math.max(60, ttlSeconds))}`,
    clearSession: (): string => `${COOKIE}=; ${attrs(secure, 0)}`,
    setPending: (sealed: string): string => `${PENDING_COOKIE}=${encodeURIComponent(sealed)}; ${attrs(secure, 600)}`,
    clearPending: (): string => `${PENDING_COOKIE}=; ${attrs(secure, 0)}`,
  };
}

export async function readSession(request: Request, secret: string): Promise<SessionData | null> {
  const s = await open<SessionData>(readCookie(request.headers.get('cookie'), COOKIE), secret);
  if (!s?.idToken || !s.person) return null;
  // The token's own expiry, honoured here so a dead token fails at our door with a clear
  // "reconnect" rather than as an opaque 401 from three hops away.
  if (typeof s.exp === 'number' && s.exp * 1000 <= Date.now()) return null;
  return s;
}

export async function readPending(request: Request, secret: string): Promise<PendingConnect | null> {
  return open<PendingConnect>(readCookie(request.headers.get('cookie'), PENDING_COOKIE), secret);
}
