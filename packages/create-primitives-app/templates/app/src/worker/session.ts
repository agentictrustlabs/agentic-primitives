// AES-GCM sealed httpOnly cookie. The id_token is a bearer credential with no revocation —
// never localStorage, never a readable cookie, never a URL.

const COOKIE = '__COOKIE_PREFIX___session';
const PENDING_COOKIE = '__COOKIE_PREFIX___pending';
const ORG_COOKIE = '__COOKIE_PREFIX___org';

export const SESSION_VERSION = 2;

export interface SessionData {
  v?: number;
  idToken: string;
  /** The PERSON's Smart Agent address. Never an organization. */
  person: string;
  agentName: string | null;
  authOrigin: string;
  homeSession?: string;
  exp: number;
}

export interface CeremonyOrg {
  address: string;
  name: string;
  stewardship?: unknown;
  at: number;
}

export interface PendingConnect {
  state: string;
  nonce: string;
  codeVerifier: string;
  authOrigin: string;
  template: 'site-login' | 'org-create';
}

async function keyFrom(secret: string): Promise<CryptoKey> {
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
  const secure = new URL(url).protocol === 'https:';
  return {
    setSession: (sealed: string, ttlSeconds: number): string =>
      `${COOKIE}=${encodeURIComponent(sealed)}; ${attrs(secure, Math.max(60, ttlSeconds))}`,
    clearSession: (): string => `${COOKIE}=; ${attrs(secure, 0)}`,
    setPending: (sealed: string): string => `${PENDING_COOKIE}=${encodeURIComponent(sealed)}; ${attrs(secure, 600)}`,
    clearPending: (): string => `${PENDING_COOKIE}=; ${attrs(secure, 0)}`,
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
  if ((s.v ?? 1) < SESSION_VERSION) return null;
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
