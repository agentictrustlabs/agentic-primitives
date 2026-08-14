// Which organizations this person has linked to THIS app, and the wire that lets us act for them.
//
// Person↔org links are private vault credentials (ADR-0025). They are not on the chain, not in a
// public index, and not in this app's storage. The Home is the only source, and it answers only
// for the person whose token we present — so "list my orgs" is genuinely scoped to the caller.
//
// The 60-second cache holds the CANONICAL answer (the Home's), not a cheaper substitute for it,
// which is the distinction that makes it a cache and not a fallback. It is per-isolate and
// deliberately short: a stewardship wire revoked on-chain must stop working within the minute,
// and the gate re-verifies every call anyway, so a stale entry costs a refusal, never access.

import { hashDelegation, type Delegation } from '@agenticprimitives/delegation';
import type { Address, Hex } from '@agenticprimitives/types';
import type { RelatedOrg } from '@starter/home-connect';
import type { DelegationWire } from '@starter/interactions-client';
import type { AppConfig } from './config.js';
import type { SessionData } from './session.js';

const TTL_MS = 60_000;
const cache = new Map<string, { at: number; orgs: RelatedOrg[] }>();

export async function orgsFor(
  cfg: AppConfig,
  session: SessionData,
  opts: { fresh?: boolean } = {},
): Promise<RelatedOrg[]> {
  const key = session.person.toLowerCase();
  const hit = cache.get(key);
  if (!opts.fresh && hit && Date.now() - hit.at < TTL_MS) return hit.orgs;

  const orgs = await cfg.connect.listRelatedOrgs(session.idToken, session.authOrigin);

  // NEVER CACHE AN EMPTY ANSWER. `forgetOrgs` clears the cache in the ONE isolate that handled
  // the callback, and Cloudflare routes the next request wherever it likes — so an isolate that
  // learned "no orgs" a moment before the ceremony would keep saying so for a full minute, to
  // somebody who had just connected one. A stale empty list is indistinguishable from a broken
  // integration, which is the worst thing a cache can be.
  //
  // Caching a NON-empty answer is still fine: the gate re-verifies every wire per call, so the
  // cost of a stale entry there is a refusal, never access.
  if (orgs.length > 0) cache.set(key, { at: Date.now(), orgs });
  else cache.delete(key);

  return orgs;
}

/** Drop the cache for one person — best effort, and only in THIS isolate; see `orgsFor`. */
export function forgetOrgs(person: string): void {
  cache.delete(person.toLowerCase());
}

/**
 * The Home's list, plus the org a ceremony just handed us.
 *
 * The Home is the source of truth for what exists. The ceremony result is the receipt for what
 * just happened, and it is true before the projection catches up — so it is merged in, not
 * chosen instead. When both carry the same org, the entry WITH a stewardship wire wins: an entry
 * without one makes the app believe it is a member when it is a steward.
 */
export function mergeCeremonyOrg(
  orgs: RelatedOrg[],
  ceremony: { address: string; name: string; stewardship?: unknown } | null,
): RelatedOrg[] {
  if (!ceremony?.address) return orgs;
  const want = ceremony.address.toLowerCase();
  const existing = orgs.find((o) => String(o.orgAgent).toLowerCase() === want);
  if (existing) {
    if (existing.stewardshipDelegation || !ceremony.stewardship) return orgs;
    return orgs.map((o) =>
      String(o.orgAgent).toLowerCase() === want
        ? { ...o, stewardshipDelegation: ceremony.stewardship as RelatedOrg['stewardshipDelegation'] }
        : o,
    );
  }
  return [
    ...orgs,
    {
      orgAgent: ceremony.address as RelatedOrg['orgAgent'],
      orgName: ceremony.name || 'Organization',
      stewardshipDelegation: ceremony.stewardship as RelatedOrg['stewardshipDelegation'],
    },
  ];
}

export function findOrg(orgs: RelatedOrg[], address: string): RelatedOrg | undefined {
  const want = address.toLowerCase();
  return orgs.find((o) => String(o.orgAgent).toLowerCase() === want);
}

/**
 * The on-chain hash of a stewardship wire — what a revoke would name, and what a person can look
 * up themselves. Surfacing it is the point: an app that holds authority over your organization
 * should be able to tell you exactly which delegation that is.
 *
 * Returns null for a wire we cannot hash rather than a plausible-looking wrong value.
 */
export function delegationHashOf(
  wire: DelegationWire | undefined,
  chainId: number,
  delegationManager: string,
): string | null {
  if (!wire?.signature) return null;
  try {
    const d: Delegation = {
      delegator: wire.delegator as Address,
      delegate: wire.delegate as Address,
      authority: wire.authority as Hex,
      caveats: wire.caveats.map((c) => ({
        enforcer: c.enforcer as Address,
        terms: c.terms as Hex,
        args: (c.args ?? '0x') as Hex,
      })),
      // The wire carries salt as a decimal string; the hash is over the uint256.
      salt: BigInt(wire.salt),
      signature: wire.signature as Hex,
    };
    return hashDelegation(d, chainId, delegationManager as Address);
  } catch {
    return null;
  }
}
