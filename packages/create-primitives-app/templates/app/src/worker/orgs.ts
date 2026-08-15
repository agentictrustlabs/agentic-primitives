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
  if (orgs.length > 0) cache.set(key, { at: Date.now(), orgs });
  else cache.delete(key);
  return orgs;
}

export function forgetOrgs(person: string): void {
  cache.delete(person.toLowerCase());
}

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
      salt: BigInt(wire.salt),
      signature: wire.signature as Hex,
    };
    return hashDelegation(d, chainId, delegationManager as Address);
  } catch {
    return null;
  }
}
