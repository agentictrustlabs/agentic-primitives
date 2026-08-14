// The one wire this package speaks: `POST {a2aBase}/interactions/{principal}/{op}`.
//
// WHY THIS SHAPE. Every operation on a principal — a person or an organization — is routed
// through ONE serialized execution point for that principal (a Durable Object keyed by its
// Smart Agent address). That is what gives ordering guarantees the underlying last-writer-wins
// vault cannot. So the address in the URL is not decoration: it selects the writer.
//
// WHAT AUTHORIZES A CALL. Two independent artifacts, and it matters which is which:
//
//   `session`     — a Home-issued OIDC id_token. Says WHO is asking. Authorizes nothing.
//   `stewardship` — an org→person delegation, ERC-1271-signed by the ORG and checked unrevoked
//                   on-chain at the gate. Says this person may act FOR that organization.
//
// A call with only a session can reach the caller's own things. A call that touches an
// organization carries both. This is ADR-0041 in one sentence: the token is the envelope, the
// delegation is the authority.
//
// `/interactions/*` is deliberately CSRF-exempt on the server (the session travels in the body,
// not in a cookie), which is exactly why it is safe to call from your server and NOT from a
// browser: a browser call would put a bearer credential in reach of any script on the page.

import { InteractionsError, type InteractionsErrorCode } from './errors.js';

/** An on-the-wire delegation. Opaque here — the gate verifies it, this package only carries it. */
export interface DelegationWire {
  delegator: string;
  delegate: string;
  authority: string;
  caveats: { enforcer: string; terms: string; args?: string }[];
  /** Decimal string. `bigint` does not survive JSON, so the wire form is a string. */
  salt: string;
  signature: string;
}

export interface TransportConfig {
  /** Base origin of the A2A worker, e.g. `https://demo-a2a-production.…workers.dev`. */
  a2aBase: string;
  /**
   * Injected fetch. On Cloudflare, pass a service binding's `fetch` — a same-account Worker
   * cannot fetch a sibling `*.workers.dev` URL over the public internet (error 1042).
   */
  fetch?: typeof fetch;
  /** Per-call timeout. A stalled RPC upstream must surface as an error, never as a hang. */
  timeoutMs?: number;
}

/** The credentials a caller presents. `stewardship` is required only for org-scoped ops. */
export interface CallerAuth {
  /** The Home-issued id_token for the connected person. */
  session: string;
  /** The org→person stewardship delegation, when acting for an organization. */
  stewardship?: DelegationWire;
}

export interface RawResult {
  status: number;
  body: Record<string, unknown>;
}

export function createTransport(config: TransportConfig) {
  const base = config.a2aBase.replace(/\/+$/, '');
  const doFetch = config.fetch ?? fetch;
  const timeoutMs = config.timeoutMs ?? 20_000;

  /** POST one op. Returns the raw status + body — the callers decide what a status MEANS. */
  async function raw(principal: string, op: string, payload: Record<string, unknown>): Promise<RawResult> {
    if (!/^0x[0-9a-fA-F]{40}$/.test(principal)) {
      throw new InteractionsError('bad_principal', `not a Smart Agent address: ${principal}`);
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await doFetch(`${base}/interactions/${principal.toLowerCase()}/${op}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      return { status: res.status, body };
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        throw new InteractionsError('unreachable', `${op} timed out after ${timeoutMs}ms`);
      }
      throw new InteractionsError('unreachable', e instanceof Error ? e.message : String(e), e);
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * POST one op and insist on success.
   *
   * The server's refusals are typed and worth preserving verbatim — they tell a developer which
   * ceremony is missing, not just that something failed:
   *
   *   409 `storage_not_enabled`  the principal has never enabled their interactions storage.
   *                              A steward does this ONCE at their Home. Nothing your app can do.
   *   409 `wire_absent`          the person has not approved their agent to message this recipient.
   *   403 `owner_only`           an app authenticated AS the person tried an op that is the
   *                              person's own to perform. Working as designed.
   *   403 `read_grant_*`         this app has no (or an out-of-scope, or a revoked) read grant.
   *   401                        the session did not verify — usually an expired id_token.
   */
  async function call(principal: string, op: string, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { status, body } = await raw(principal, op, payload);
    if (status >= 200 && status < 300 && body.ok !== false) return body;

    const serverCode = typeof body.code === 'string' ? body.code : '';
    const message = String(body.error ?? body.detail ?? `${op} failed (HTTP ${status})`);
    throw new InteractionsError(classify(status, serverCode, message), message, body, serverCode || undefined);
  }

  return { raw, call, base };
}

function classify(status: number, serverCode: string, message: string): InteractionsErrorCode {
  if (serverCode === 'owner_only') return 'owner_only';
  if (serverCode.startsWith('read_grant')) return 'read_grant';
  if (serverCode === 'wire_absent' || serverCode === 'recipient_not_in_wire') return 'messaging_not_approved';
  if (status === 401) return 'session_invalid';
  if (status === 403) return 'not_authorized';
  if (status === 404) return 'not_found';
  // The 409 the server returns for a missing/stale interactions grant is prose, not a code —
  // match on what it actually says rather than inventing a code the server does not send.
  if (status === 409 && /interactions grant|enable (storage|interactions)/i.test(message)) {
    return 'storage_not_enabled';
  }
  if (status === 409) return 'conflict';
  if (status >= 500) return 'server_error';
  return 'refused';
}

export type Transport = ReturnType<typeof createTransport>;
