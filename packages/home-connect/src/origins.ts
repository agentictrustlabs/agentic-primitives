// WHERE a person's Home lives, and which Homes this app will talk to.
//
// ADR-0021: no hostname belongs in a reusable package. This module is the ONE place in this
// repo that knows about `impact-agent.me`, and it takes the value from config — the default is
// a convenience for the reference deployment, not a hardcoded dependency.
//
// ADR-0013 (no silent fallbacks): `resolveHomeOrigin` has exactly one rule — a person with a
// claimed name lives at `<label>.<zone>`, and everyone else starts at the apex. It never tries
// the apex "because the subdomain 404'd".

/** The reference deployment's Home. Override via `HomeConnectConfig.homeOrigin`. */
export const DEFAULT_HOME_ORIGIN = 'https://www.impact-agent.me';

export interface HomeOriginPolicy {
  /** The apex Home origin — where a person with no claimed name starts. */
  apex: string;
  /**
   * Registrable domain whose single-label subdomains are also trusted Homes
   * (`alice.impact-agent.me`). Derived from `apex` when omitted.
   *
   * ONE label only, never nested: `a.b.impact-agent.me` is NOT a Home. A wildcard that matched
   * nested labels would let anyone who could register a sub-subdomain mint a "trusted" issuer.
   */
  zone?: string;
}

/** `nathan.impact` / `nathan.impact.agent` / `nathan` → `nathan`. Empty for an unusable name. */
export function homeLabelOf(agentName: string | undefined | null): string {
  const first = String(agentName ?? '').trim().toLowerCase().split('.')[0] ?? '';
  return /^[a-z0-9][a-z0-9-]{0,62}$/.test(first) ? first : '';
}

/** Derive the registrable zone (`impact-agent.me`) from an origin. */
function zoneOf(origin: string): string {
  try {
    const parts = new URL(origin).hostname.toLowerCase().split('.');
    return parts.length >= 2 ? parts.slice(-2).join('.') : parts.join('.');
  } catch {
    return '';
  }
}

/**
 * The Home origin for `agentName`.
 *
 * A named person's Home IS their subdomain — that is the deployment's rule, and it is why an
 * app must accept `<label>.<zone>` as an issuer as well as the apex. An empty or unclaimed name
 * lands at the apex, which is where onboarding happens.
 */
export function resolveHomeOrigin(agentName: string | undefined, policy: HomeOriginPolicy): string {
  const label = homeLabelOf(agentName);
  if (!label) return policy.apex;
  const zone = policy.zone ?? zoneOf(policy.apex);
  if (!zone) return policy.apex;
  return `https://${label}.${zone}`;
}

/**
 * Hard issuer allowlist (the relying-side half of SEC-018).
 *
 * True only for the apex origin or a SINGLE-label subdomain of the zone, over https. Anything
 * else — a different scheme, a nested label, a lookalike host — is false, and a false here must
 * abort the sign-in rather than downgrade it.
 */
export function isAllowedHomeOrigin(origin: string, policy: HomeOriginPolicy): boolean {
  let u: URL;
  try {
    u = new URL(origin);
  } catch {
    return false;
  }
  let apex: URL;
  try {
    apex = new URL(policy.apex);
  } catch {
    return false;
  }
  // http is admitted ONLY for loopback, so `wrangler dev` against a local Home works without
  // opening a downgrade path on any real host.
  const loopback = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  if (u.protocol !== 'https:' && !(u.protocol === 'http:' && loopback)) return false;
  if (u.origin === apex.origin) return true;

  const zone = (policy.zone ?? zoneOf(policy.apex)).toLowerCase();
  if (!zone) return false;
  const host = u.hostname.toLowerCase();
  if (!host.endsWith('.' + zone)) return false;
  const label = host.slice(0, host.length - zone.length - 1);
  return label.length > 0 && !label.includes('.');
}
