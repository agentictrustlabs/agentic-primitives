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

export async function orgsFor(cfg: AppConfig, session: SessionData): Promise<RelatedOrg[]> {
  const key = session.person.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.orgs;
  const orgs = await cfg.connect.listRelatedOrgs(session.idToken, session.authOrigin);
  cache.set(key, { at: Date.now(), orgs });
  return orgs;
}

/** Drop the cache for one person — called after a ceremony that changes their org set. */
export function forgetOrgs(person: string): void {
  cache.delete(person.toLowerCase());
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
