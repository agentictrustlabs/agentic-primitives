// Reachable ≠ trusted.
//
// A Home publishes a signed, portable manifest (spec 310) describing its endpoints, surfaces and
// validity window. `@agenticprimitives/home` owns the schema and the fail-closed validators; this
// module is the fetch + the verdict.
//
// HONEST STATUS: in the reference deployment the manifest is published PER HANDLE
// (`https://<label>.impact-agent.me/.well-known/agentic-home`) and the apex returns 404. So a
// manifest is advisory context for an app that has not yet learned the person's name, and a gate
// once it has. `verdict.checked === false` means "no manifest was served" — it never means "trusted".

import { isManifestCurrent, validateHomeManifest, type HomeManifestV1 } from '@agenticprimitives/home';

export interface HomeTrustVerdict {
  /** Did a manifest actually come back and parse? False ⇒ nothing was checked. */
  checked: boolean;
  /** True only when a manifest was served AND is structurally valid AND is current. */
  current: boolean;
  manifest?: HomeManifestV1;
  /** Structural errors from `validateHomeManifest`, or a transport reason. */
  errors: string[];
}

/**
 * Fetch and gate a Home's manifest.
 *
 * Never throws: a Home that publishes nothing must not break a sign-in that does not depend on
 * the manifest. Callers that DO depend on it check `verdict.current` and refuse on false.
 */
export async function fetchHomeManifest(
  homeOrigin: string,
  opts: { timeoutMs?: number; now?: string } = {},
): Promise<HomeTrustVerdict> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 8_000);
  try {
    const res = await fetch(new URL('/.well-known/agentic-home', homeOrigin).toString(), {
      headers: { accept: 'application/json' },
      signal: ctrl.signal,
    });
    if (!res.ok) return { checked: false, current: false, errors: [`manifest http ${res.status}`] };
    const body = (await res.json().catch(() => null)) as HomeManifestV1 | null;
    if (!body || typeof body !== 'object') {
      return { checked: false, current: false, errors: ['manifest was not JSON'] };
    }
    // `validateHomeManifest` returns a list of typed reason codes (`missing_proof`,
    // `expires_before_valid_from`, …) — surface them verbatim rather than prettifying, so a
    // developer can grep the package for the exact rule that refused.
    const errors: string[] = validateHomeManifest(body);
    if (errors.length > 0) return { checked: true, current: false, manifest: body, errors };
    const current = isManifestCurrent(body, opts.now ?? new Date().toISOString());
    return { checked: true, current, manifest: body, errors: current ? [] : ['manifest is expired or suspended'] };
  } catch (e) {
    return {
      checked: false,
      current: false,
      errors: [e instanceof Error ? e.message : String(e)],
    };
  } finally {
    clearTimeout(timer);
  }
}
