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

interface InviteResult {
  /** `sent` when the Home has a mail provider; `logged` when it does not. */
  delivery: string;
  /** The join link. The ONLY way the invitation travels when delivery is `logged`. */
  joinUrl: string | null;
  email: string;
}

/**
 * Members — who is in the community, and how somebody else gets in.
 *
 * The invite is expressed here and performed at the Home, because it cannot be performed here:
 * it writes a single-use record into the ORGANIZATION's encrypted vault and sends mail, both of
 * which need custody this app does not hold. The Home re-verifies stewardship on-chain before it
 * does either — an app asking on somebody's behalf is not authority.
 *
 * The invitee joins as a MEMBER, which admits them to the community's channels and grants nothing
 * over the organization. Membership is not stewardship (ADR-0025), and the difference is worth
 * saying on the screen where someone is handing it out.
 */
export function Members({ org }: { org: OrgSummary | null }) {
  const [members, setMembers] = useState<DirectoryMember[]>([]);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState<InviteResult | null>(null);
  const [error, setError] = useState<CommonsError | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const orgAddress = org?.address ?? '';

  const load = useCallback(async () => {
    if (!orgAddress) return;
    setError(null);
    try {
      const r = await api.get<{ members: DirectoryMember[] }>(`/api/members?org=${orgAddress}`);
      setMembers(r.members);
    } catch (e) {
      if (e instanceof CommonsError) setError(e);
    } finally {
      setLoaded(true);
    }
  }, [orgAddress]);

  useEffect(() => {
    setSent(null);
    setLoaded(false);
    void load();
  }, [load]);

  if (!org) return <Empty>Connect a community to see its members.</Empty>;

  const invite = async () => {
    if (!email.trim()) return;
    setBusy(true);
    setError(null);
    setSent(null);
    try {
      const r = await api.post<{ delivery: string; joinUrl: string | null }>('/api/invite', {
        org: orgAddress,
        email: email.trim(),
      });
      setSent({ ...r, email: email.trim() });
      setEmail('');
    } catch (e) {
      if (e instanceof CommonsError) setError(e);
    } finally {
      setBusy(false);
    }
  };

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
          nothing over the organization itself. The invitation is single-use and expires in seven days.
        </p>
        {!org.steward && (
          <p className="muted" style={{ marginTop: 8 }}>
            Only a steward can invite. Your Home will refuse this on-chain, not this app — so if you
            believe you steward {org.name}, the delegation is what to look at.
          </p>
        )}
        <div className="stack" style={{ marginTop: 10, maxWidth: 460 }}>
          <input
            type="text"
            placeholder="their email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void invite();
            }}
          />
          <div className="row">
            <button className="primary" onClick={invite} disabled={busy || !email.trim()}>
              {busy ? 'Asking your Home…' : 'Send invitation'}
            </button>
            <span className="muted">sent by your Home, from the organization&apos;s vault</span>
          </div>
        </div>

        {sent && (
          <div className="notice" style={{ marginTop: 12 }}>
            {sent.delivery === 'sent' ? (
              <>
                <strong>Invitation emailed to {sent.email}</strong>
                <p style={{ margin: '4px 0 0' }}>
                  They join by opening the link, confirming that address, and signing in at their own Home
                  — which is where their identity gets created, not here.
                </p>
              </>
            ) : (
              <>
                <strong>Invitation created — but not emailed</strong>
                <p style={{ margin: '4px 0 8px' }}>
                  This Home has no mail provider configured, so it logged the message instead of sending it.
                  The link below is the only way the invitation reaches {sent.email}. Saying &quot;invited&quot;
                  here would be a lie.
                </p>
                {sent.joinUrl && (
                  <code style={{ wordBreak: 'break-all', fontSize: 11 }}>{sent.joinUrl}</code>
                )}
              </>
            )}
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
