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
const ORG_COOKIE = 'commons_org';

/**
 * Bumped when a stored session's MEANING changes, not merely its shape.
 *
 * v1 sessions were written from whatever `sub` the callback token carried — which for an
 * `org-create` ceremony is the ORGANIZATION, not the person. Those cookies name the wrong agent
 * as `person`, and every call made with one acts as the org. There is no way to repair that from
 * the cookie alone (the token cannot say who the person is), so they are rejected and the person
 * signs in again, which takes one click and yields a correct session.
 */
export const SESSION_VERSION = 2;

export interface SessionData {
  /** See `SESSION_VERSION`. Absent or lower ⇒ not a session. */
  v?: number;
  idToken: string;
  /** The PERSON's Smart Agent address. Never an organization — see the callback in index.ts. */
  person: string;
  agentName: string | null;
  authOrigin: string;
  /** Unix seconds — the id_token's own `exp`, not a policy of ours. */
  exp: number;
}

/**
 * The organization a ceremony just handed us, kept in its own cookie.
 *
 * WHY THIS EXISTS. `org-create` returns the org AND its stewardship delegation in the token
 * response — authoritative, and true the instant the person finishes. The Home ALSO writes a
 * `related-orgs` link, but that is a projection maintained by a different service on a different
 * timeline, and an app that depends on it alone shows "no community connected" to somebody who
 * just connected one. Which is exactly what happened.
 *
 * So the ceremony result is carried here and MERGED with the Home's list, rather than discarded
 * in favour of it. The Home stays the source of truth for what exists; this is the receipt for
 * what just happened.
 *
 * Its own cookie because a stewardship wire is kilobytes and the session cookie must stay small —
 * a session that silently exceeds the 4 KB cookie limit is a sign-in that stops working.
 */
export interface CeremonyOrg {
  address: string;
  name: string;
  /** The org→person stewardship delegation, as returned by the Home. */
  stewardship?: unknown;
  at: number;
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
    /**
     * Returns null when the sealed value would not survive as a cookie.
     *
     * Browsers cap a cookie near 4 KB and DROP an oversized one silently — which would look
     * exactly like "the ceremony did not work" while everything upstream succeeded. Refusing to
     * set it is worse UX and better engineering: the caller reports it, and the Home's list is
     * still there to fall back on. (Not a fallback in the ADR-0013 sense — both are the same
     * mechanism, and this one is a receipt, not a second way of asking.)
     */
    setOrg: (sealed: string, ttlSeconds: number): string | null => {
      const cookie = `${ORG_COOKIE}=${encodeURIComponent(sealed)}; ${attrs(secure, Math.max(60, ttlSeconds))}`;
      return cookie.length > 3900 ? null : cookie;
    },
    clearOrg: (): string => `${ORG_COOKIE}=; ${attrs(secure, 0)}`,
  };
}

export async function readSession(request: Request, secret: string): Promise<SessionData | null> {
  const s = await open<SessionData>(readCookie(request.headers.get('cookie'), COOKIE), secret);
  if (!s?.idToken || !s.person) return null;
  // A session from before the subject/person split named an organization as the person. Rejecting
  // it is the only honest move: it decrypts fine and is wrong, which is the worst combination.
  if ((s.v ?? 1) < SESSION_VERSION) return null;
  // The token's own expiry, honoured here so a dead token fails at our door with a clear
  // "reconnect" rather than as an opaque 401 from three hops away.
  if (typeof s.exp === 'number' && s.exp * 1000 <= Date.now()) return null;
  return s;
}

export async function readPending(request: Request, secret: string): Promise<PendingConnect | null> {
  return open<PendingConnect>(readCookie(request.headers.get('cookie'), PENDING_COOKIE), secret);
}

export async function readCeremonyOrg(request: Request, secret: string): Promise<CeremonyOrg | null> {
  const org = await open<CeremonyOrg>(readCookie(request.headers.get('cookie'), ORG_COOKIE), secret);
  return org?.address ? org : null;
}
