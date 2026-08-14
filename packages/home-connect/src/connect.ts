// The connect flow, end to end.
//
//   startConnect()   → the URL you send the person to (PKCE + state + nonce)
//   completeConnect() → code → verified id_token + the person's Smart Agent address
//
// The OIDC mechanics (authorize URL, PKCE, /token, ES256 id_token verification against the
// Home's JWKS) come from `@agenticprimitives/connect-client` — the published package the
// reference apps use. This module adds the three things a third-party app still owns:
//
//   1. WHERE the Home is        (`origins.ts`, injected — no hostname in the generic package)
//   2. WHICH issuers it trusts  (the same, as a hard allowlist)
//   3. WHAT comes back besides the token — the org payload and its stewardship delegation,
//      which is the credential that lets your app act FOR an organization (see below).
//
// Run this SERVER-SIDE (a Worker, a route handler). Two reasons, both real:
//   · the id_token is a bearer credential; keep it out of `localStorage` and out of JS reach,
//   · the live A2A worker is origin-locked, so your server is the only thing that can call it.

import { createConnectClient, type ConnectClient } from '@agenticprimitives/connect-client';
import type { Address } from '@agenticprimitives/types';
import { asDelegationWire, type DelegationWire } from './delegation.js';
import { HomeConnectError } from './errors.js';
import {
  DEFAULT_HOME_ORIGIN,
  isAllowedHomeOrigin,
  resolveHomeOrigin,
  type HomeOriginPolicy,
} from './origins.js';

export interface HomeConnectConfig {
  /** Your registered client_id at the Home. See docs/register-your-app.md. */
  clientId: string;
  /**
   * EXACT redirect URI registered at the Home (CN-1 — exact match, never a prefix).
   * A mismatch is refused at the Home's grant endpoint with a "Request blocked" screen,
   * which reads like a bug and is actually the allowlist doing its job.
   */
  redirectUri: string;
  /**
   * The relying-site DELEGATE: the backend account the Home scopes its grant TO.
   *
   * A delegate, never a custodian (ADR-0019). Compromising it yields something the person
   * revokes on-chain; it never becomes control of their identity. The Home treats a
   * URL-supplied delegate as a HINT and uses its own registered value, so getting this
   * wrong is harmless — but pass the registered one anyway.
   */
  delegate: Address;
  /** Apex Home origin. Defaults to the reference deployment. */
  homeOrigin?: string;
  /** Registrable zone whose single-label subdomains are also Homes. Derived from `homeOrigin`. */
  homeZone?: string;
  /** OIDC scope. Default `openid agent`. */
  scope?: string;
}

/** What `startConnect` hands back. Persist ALL of it — `completeConnect` needs every field. */
export interface ConnectStart {
  /** Send the person here. */
  url: string;
  /** Echo back on return; a mismatch is a rejected request, not a retry. */
  state: string;
  /** Bound into the id_token; verified on the way back. */
  nonce: string;
  /** PKCE verifier. Never leaves your server. */
  codeVerifier: string;
  /** The Home origin this flow was started against. */
  authOrigin: string;
}

/** The org identity a `org-create` ceremony returns, including the credential that matters. */
export interface RelatedOrg {
  orgAgent: Address;
  orgName: string;
  /**
   * The org→person STEWARDSHIP delegation.
   *
   * THIS IS THE ONE THAT LETS YOUR APP ACT FOR AN ORGANIZATION. The id_token says who the
   * person is; this signed, on-chain-revocable wire says the organization named them its
   * steward. Every org-scoped call (`channels.*`, `content.*`, `directory.*`) carries it and
   * every gate re-verifies it — ERC-1271 against the org, caveat shape, unrevoked on-chain.
   * Your app stores it; it can never mint it.
   */
  stewardshipDelegation?: DelegationWire;
  /** person→org: lets the org read its member's data. Separate decision, separate wire. */
  membershipDelegation?: DelegationWire;
  purpose?: string;
}

/** A verified sign-in. */
export interface ConnectResult {
  /** The Home-signed OIDC token. Bearer credential — server-side only, short-lived. */
  idToken: string;
  claims: PersonClaims;
  /** The person's canonical Smart Agent address. This, not the name, is the identifier. */
  person: Address;
  /** The person's claimed agent name, when they have one. */
  agentName?: string;
  /** The scoped delegation the Home issued to your `delegate` (authority, not identity). */
  delegation?: DelegationWire;
  /** Present when the ceremony was `org-create`. */
  org?: RelatedOrg;
  /** Which Home issued this. */
  authOrigin: string;
}

export interface PersonClaims {
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  nonce?: string;
  agent_name?: string;
  canonical_agent_id?: string;
}

/** What the ceremony is FOR. The Home fixes the caveat set per template; your app cannot widen it. */
export type ConnectTemplate =
  /** Just sign in. Returns an id_token + a scoped site delegation. */
  | 'site-login'
  /**
   * Sign in AND settle on an organization. In chooser mode (no `orgBase`) the Home asks the
   * person to pick an org they already steward or to name and deploy a new one, custodied by
   * THEIR credential. Your app cannot deploy an org — that is the point.
   */
  | 'org-create';

export interface HomeConnect {
  /** Which Home a given name lives at (apex when the name is empty/unclaimed). */
  homeOriginFor(agentName?: string): string;
  /** Is this a Home this app will accept an issuer from? */
  trustsIssuer(origin: string): boolean;
  /** Build the authorize request. Nothing is created anywhere until the person acts at the Home. */
  startConnect(opts?: { agentName?: string; template?: ConnectTemplate; orgPurpose?: string }): Promise<ConnectStart>;
  /** Exchange `code`, verify the id_token, return the person. Throws `HomeConnectError`. */
  completeConnect(args: { start: ConnectStart; code: string; state: string }): Promise<ConnectResult>;
  /**
   * Orgs this person has linked to THIS app, with their stewardship wires (spec 246 / ADR-0025).
   *
   * Person↔org links are PRIVATE vault credentials — they are not public graph state and there
   * is no way to enumerate them from the chain. The Home is the only source, and it answers
   * only for the person whose token you present.
   */
  listRelatedOrgs(idToken: string, authOrigin: string): Promise<RelatedOrg[]>;
  /** Decode without verifying — for logging only. Trust comes from `completeConnect`. */
  decodeIdToken(idToken: string): PersonClaims;
  /** The person's SA from a token's `sub` / `canonical_agent_id`. */
  personOf(idToken: string): Address;
}

export function createHomeConnect(config: HomeConnectConfig): HomeConnect {
  const policy: HomeOriginPolicy = {
    apex: config.homeOrigin ?? DEFAULT_HOME_ORIGIN,
    ...(config.homeZone ? { zone: config.homeZone } : {}),
  };
  const trustsIssuer = (origin: string): boolean => isAllowedHomeOrigin(origin, policy);
  const homeOriginFor = (agentName?: string): string => resolveHomeOrigin(agentName, policy);

  const client: ConnectClient = createConnectClient({
    clientId: config.clientId,
    delegate: config.delegate,
    redirectUri: () => config.redirectUri,
    resolveAuthOrigin: (name?: string) => homeOriginFor(name),
    isAllowedIssuerOrigin: trustsIssuer,
    ...(config.scope ? { scope: config.scope } : {}),
  });

  return {
    homeOriginFor,
    trustsIssuer,

    async startConnect(opts = {}) {
      const template = opts.template ?? 'site-login';
      const start =
        template === 'org-create'
          ? // Chooser mode: no `orgBase`, so the Home asks the person to pick or name. Passing a
            // base here would mean YOUR app decided which org — it is theirs to choose.
            await client.startOrgCreation(opts.agentName ?? '', undefined, {
              ...(opts.orgPurpose ? { purpose: opts.orgPurpose } : {}),
            })
          : await client.startEnrollment(opts.agentName ?? '');
      return {
        url: start.url,
        state: start.state,
        nonce: start.nonce,
        codeVerifier: start.codeVerifier,
        authOrigin: start.authOrigin,
      };
    },

    async completeConnect({ start, code, state }) {
      // Constant work either way; `state` is short and app-generated, so a plain compare is
      // honest here — the value is unguessable, not secret.
      if (!state || state !== start.state) {
        throw new HomeConnectError('state_mismatch', 'state did not match the request this app started');
      }
      if (!trustsIssuer(start.authOrigin)) {
        throw new HomeConnectError('issuer_not_allowed', `refusing to exchange a code at ${start.authOrigin}`);
      }

      let tok: Awaited<ReturnType<ConnectClient['exchangeCode']>>;
      try {
        tok = await client.exchangeCode(start.authOrigin, code, start.codeVerifier);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        // The Home says "unknown client" / "redirect_uri mismatch" for an unregistered app.
        // Name that specifically: it is the single most common first-run failure and it is a
        // registration step, not a code defect.
        const code2 = /redirect|client/i.test(msg) ? 'redirect_not_registered' : 'code_exchange_failed';
        throw new HomeConnectError(code2, msg, e);
      }

      let claims: PersonClaims;
      try {
        claims = await client.verifyIdToken(start.authOrigin, tok.idToken, start.nonce);
      } catch (e) {
        throw new HomeConnectError('token_invalid', e instanceof Error ? e.message : String(e), e);
      }

      const person = (claims.canonical_agent_id ?? claims.sub ?? '').match(/0x[0-9a-fA-F]{40}$/)?.[0] as
        | Address
        | undefined;
      if (!person) throw new HomeConnectError('no_agent_in_token', 'id_token carries no Smart Agent address');

      const orgRaw = tok.org as Record<string, unknown> | undefined;
      // A structurally broken wire is dropped rather than carried: `stewardshipDelegation`
      // being PRESENT is what makes an app believe it may act for the organization, so a
      // half-formed value is worse than none.
      const org: RelatedOrg | undefined =
        orgRaw && typeof orgRaw.orgAgent === 'string'
          ? {
              orgAgent: orgRaw.orgAgent as Address,
              orgName: String(orgRaw.orgName ?? ''),
              stewardshipDelegation: asDelegationWire(orgRaw.stewardshipDelegation),
              membershipDelegation: asDelegationWire(orgRaw.membershipDelegation),
              purpose: typeof orgRaw.purpose === 'string' ? orgRaw.purpose : undefined,
            }
          : undefined;

      return {
        idToken: tok.idToken,
        claims,
        person: person.toLowerCase() as Address,
        ...(claims.agent_name ? { agentName: claims.agent_name } : {}),
        ...((): { delegation?: DelegationWire } => {
          const d = asDelegationWire(tok.delegation);
          return d ? { delegation: d } : {};
        })(),
        ...(org ? { org } : {}),
        authOrigin: start.authOrigin,
      };
    },

    async listRelatedOrgs(idToken, authOrigin) {
      if (!trustsIssuer(authOrigin)) {
        throw new HomeConnectError('issuer_not_allowed', `refusing to read orgs from ${authOrigin}`);
      }
      const url = new URL('/connect/related-orgs', authOrigin);
      url.searchParams.set('client_id', config.clientId);
      // BOUNDED. A stalled cross-origin read must not hang the page that called it. On timeout
      // the answer is "none" — an answer, not a hang, and not a retry against a different route.
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 12_000);
      try {
        const r = await fetch(url.toString(), {
          headers: { authorization: `Bearer ${idToken}` },
          signal: ctrl.signal,
        });
        if (!r.ok) return [];
        const body = (await r.json().catch(() => ({}))) as { orgs?: Record<string, unknown>[] };
        if (!Array.isArray(body.orgs)) return [];
        return body.orgs
          .filter((o) => typeof o.orgAgent === 'string')
          .map((o) => ({
            orgAgent: o.orgAgent as Address,
            orgName: String(o.orgName ?? ''),
            stewardshipDelegation: asDelegationWire(o.stewardshipDelegation),
            membershipDelegation: asDelegationWire(o.membershipDelegation),
            purpose: typeof o.purpose === 'string' ? o.purpose : undefined,
          }));
      } catch {
        return [];
      } finally {
        clearTimeout(timer);
      }
    },

    decodeIdToken: (idToken) => client.decodeIdToken(idToken),
    personOf: (idToken) => client.personAddressFromIdToken(idToken),
  };
}
