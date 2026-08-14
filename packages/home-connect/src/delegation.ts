// The on-the-wire delegation shape.
//
// `@agenticprimitives/connect-client` types what the Home returns as `Record<string, unknown>`,
// on purpose: the package is at the base of the graph and must not depend on the delegation
// package to describe a value it only forwards. So narrowing is the RELYING app's job, and it is
// a real check rather than a cast — a malformed wire should be absent, not present-and-broken,
// because "present" is what makes an app decide it is a steward.
//
// Note what is NOT validated here: the signature, the caveats, the on-chain revocation state.
// None of those are ours to judge and re-deriving them here would invite exactly the mistake the
// substrate exists to prevent — an app deciding for itself that it has authority. The gate
// verifies all of it, per call, against the chain.

/** The JSON form of an EIP-712 delegation. `salt` is a decimal string; `bigint` does not survive JSON. */
export interface DelegationWire {
  delegator: string;
  delegate: string;
  authority: string;
  caveats: { enforcer: string; terms: string; args?: string }[];
  salt: string;
  signature: string;
}

const isHexish = (v: unknown): v is string => typeof v === 'string' && v.startsWith('0x');

/** Narrow an opaque value to a structurally complete wire, or `undefined`. Never throws. */
export function asDelegationWire(value: unknown): DelegationWire | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const v = value as Record<string, unknown>;
  if (!isHexish(v.delegator) || !isHexish(v.delegate) || !isHexish(v.authority)) return undefined;
  if (!isHexish(v.signature)) return undefined;
  if (!Array.isArray(v.caveats)) return undefined;

  const caveats: DelegationWire['caveats'] = [];
  for (const c of v.caveats as unknown[]) {
    if (!c || typeof c !== 'object') return undefined;
    const cav = c as Record<string, unknown>;
    if (!isHexish(cav.enforcer) || !isHexish(cav.terms)) return undefined;
    caveats.push({
      enforcer: cav.enforcer,
      terms: cav.terms,
      ...(isHexish(cav.args) ? { args: cav.args } : {}),
    });
  }

  // The salt arrives as a decimal string or a number depending on who serialized it; normalize
  // to the string form the hashers expect, and refuse anything that is not an integer.
  const salt = typeof v.salt === 'number' ? String(v.salt) : typeof v.salt === 'string' ? v.salt : '';
  if (!/^\d+$/.test(salt)) return undefined;

  return {
    delegator: v.delegator,
    delegate: v.delegate,
    authority: v.authority,
    caveats,
    salt,
    signature: v.signature,
  };
}
