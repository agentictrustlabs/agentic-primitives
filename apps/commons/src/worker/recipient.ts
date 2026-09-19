/**
 * How a typed recipient becomes one send path.
 *
 * The caller picks the namespace by what they typed and whether a community is selected —
 * not by trying one resolver and falling through to another (ADR-0013).
 *
 *   0x…              → address
 *   name with a dot  → public agent name (naming service)
 *   bare label + org → how they are known in that community
 *   bare label, no org → public agent name, `label.impact`
 */

export type RecipientRef =
  | { kind: 'address'; address: string }
  | { kind: 'org-member'; name: string; org: string }
  | { kind: 'agent-name'; agentName: string };

const ADDR = /^0x[0-9a-fA-F]{40}$/;

export function classifyRecipient(raw: string, org?: string | null): RecipientRef {
  const s = raw.trim();
  if (ADDR.test(s)) return { kind: 'address', address: s.toLowerCase() };
  if (s.includes('.')) return { kind: 'agent-name', agentName: s.toLowerCase() };
  const orgAddr = (org ?? '').trim().toLowerCase();
  if (ADDR.test(orgAddr)) return { kind: 'org-member', name: s, org: orgAddr };
  return { kind: 'agent-name', agentName: toPublicAgentName(s) };
}

export function toPublicAgentName(raw: string): string {
  const s = raw.trim().toLowerCase();
  if (s.includes('.')) return s;
  const label = s.replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
  return `${label || s}.impact`;
}

export function addressFromSubject(subject: string | undefined): string | null {
  const m = String(subject ?? '').match(/0x[0-9a-fA-F]{40}/);
  return m?.[0]?.toLowerCase() ?? null;
}

function slug(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
}

/** Match an org-local name or listing display name. The address is the identity. */
export function memberAddressByName(
  members: ReadonlyArray<{ subject?: string; displayName?: string; localName?: string }>,
  name: string,
): string | null {
  const want = name.trim().toLowerCase();
  const wantSlug = slug(name);
  if (!want) return null;
  for (const m of members) {
    const addr = addressFromSubject(m.subject);
    if (!addr) continue;
    const local = String(m.localName ?? '').trim().toLowerCase();
    const display = String(m.displayName ?? '').trim().toLowerCase();
    if (local === want || display === want || slug(local) === wantSlug || slug(display) === wantSlug) {
      return addr;
    }
  }
  return null;
}
