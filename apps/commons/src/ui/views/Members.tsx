import { useCallback, useEffect, useState } from 'react';
import type { OrgSummary } from '../../shared/api-types.js';
import { api, CommonsError } from '../api.js';
import { Empty, ErrorLine, NotAuthorizedNotice } from './parts.js';

interface DirectoryMember {
  subject?: string;
  displayName?: string;
  publishedAt?: string;
  [k: string]: unknown;
}

interface InviteRoute {
  /** Does this app hold the org's stewardship wire? The Home requires it to issue an invitation. */
  canInvite: boolean;
  orgName: string;
  /** The Home page where the invitation is actually issued. */
  ceremonyUrl: string;
}

/**
 * Members — who is in the community, and where somebody else gets invited.
 *
 * The invitation is RESOLVED here and ISSUED at the Home. Not an attempt that falls back: a
 * selection made up front, because a relying app can never complete this one.
 *
 * An invitation carries a member-access grant the ORGANIZATION signed against the invitee's
 * address. Without it they accept, arrive, and are refused — an invitation that looked issued at
 * every step and admitted nobody. Producing that signature takes the org's custody, reached
 * through the steward's own credential, which is a Home session. This app authenticates AS the
 * person and holds no custody.
 *
 * So it does what it does for every other ceremony — enabling storage, approving messaging,
 * granting a read scope — and sends the person to their Home. None of those happen on this
 * origin, and that is the property worth keeping.
 *
 * The invitee joins as a MEMBER: admitted to the community's channels, granted nothing over the
 * organization. Membership is not stewardship (ADR-0025), and the screen where somebody hands it
 * out is the right place to say so.
 */
export function Members({ org }: { org: OrgSummary | null }) {
  const [members, setMembers] = useState<DirectoryMember[]>([]);
  const [invite, setInvite] = useState<InviteRoute | null>(null);
  const [error, setError] = useState<CommonsError | null>(null);
  const [loaded, setLoaded] = useState(false);

  const orgAddress = org?.address ?? '';

  const load = useCallback(async () => {
    if (!orgAddress) return;
    setError(null);
    try {
      const r = await api.get<{ members: DirectoryMember[] }>(`/api/members?org=${orgAddress}`);
      setMembers(r.members);
      setInvite(await api.get<InviteRoute>(`/api/invite?org=${orgAddress}`));
    } catch (e) {
      if (e instanceof CommonsError) setError(e);
    } finally {
      setLoaded(true);
    }
  }, [orgAddress]);

  useEffect(() => {
    setInvite(null);
    setLoaded(false);
    void load();
  }, [load]);

  if (!org) return <Empty>Connect a community to see its members.</Empty>;

  return (
    <>
      {error?.code === 'not_authorized' ? (
        <NotAuthorizedNotice orgName={org.name} steward={org.steward} />
      ) : (
        error && <ErrorLine error={error} onDismiss={() => setError(null)} />
      )}

      <div className="panel">
        <h2>Invite someone to {org.name}</h2>
        <p className="muted">
          They join as a <strong>member</strong> — admitted to this community&apos;s channels, and granted
          nothing over the organization itself.
        </p>
        {/*
          NOT a form that posts an email from here, and the reason is the whole architecture.

          An invitation has to carry a grant the ORGANIZATION signed against the invitee's address.
          Without it they accept, arrive, and are told the organization has not authorized them —
          an invitation that looked issued at every step and admitted nobody.

          That signature takes the organization's custody, reached through your own credential,
          which lives at your Home and deliberately not here. So this app sends you there, exactly
          as it does for enabling storage or approving messaging.
        */}
        <p className="muted" style={{ marginTop: 8 }}>
          The invitation is issued at your Home. It has to be: it carries a grant the organization
          signs against the person you are inviting, and producing that takes your credential — which
          lives at your Home and never on this origin. An invitation without it would create them a
          home that {org.name} then refuses to admit.
        </p>
        {invite && !invite.canInvite && (
          <p className="muted" style={{ marginTop: 8 }}>
            This app holds no stewardship delegation for {org.name}, so your Home will refuse to issue
            one. Re-connect the community here so it issues you the wire.
          </p>
        )}
        {invite && (
          <div className="row" style={{ marginTop: 12 }}>
            <a
              className="primary"
              href={invite.ceremonyUrl}
              target="_blank"
              rel="noreferrer"
              style={{ textDecoration: 'none', display: 'inline-block' }}
            >
              Invite at your Home →
            </a>
            <span className="muted">opens {org.name}&apos;s invite page</span>
          </div>
        )}
      </div>

      <div className="panel">
        <h2>In this community</h2>
        <p className="muted">
          Each listing re-verifies against the subject&apos;s own signature at the gate. Being in the index
          is not trust — the index itself is writable under the execution grant.
        </p>
        <div style={{ marginTop: 10 }}>
          {members.length === 0 && loaded && <Empty>Nobody has published a listing here yet.</Empty>}
          {members.map((m, i) => (
            <div key={String(m.subject ?? i)} className="item">
              <strong>{m.displayName || 'Member'}</strong>
              <p className="meta addr">{String(m.subject ?? '')}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
