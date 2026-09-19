import { useCallback, useEffect, useState } from 'react';
import type { MessagingState } from '../../shared/api-types.js';
import { api, CommonsError } from '../api.js';
import { Empty, ErrorLine } from './parts.js';

interface InboxEnvelope {
  id?: string;
  conversationId?: string;
  subject?: string;
  from?: string;
  createdAt?: string;
  preview?: string;
  bodyText?: string;
}

interface MemberOption {
  /** What gets typed into the recipient box — a public agent name, or an org-local name. */
  value: string;
  /** The other facet, shown as the option hint. */
  hint: string;
}

/**
 * 1:1 messages.
 *
 * Sending is performed by the SENDER's own agent under a wire the sender signed — not by this
 * app, and not by a shared service account. The recipient's gate verifies that wire: who signed
 * it, which recipients it names, whether it is still live on-chain. So a message from this app is
 * indistinguishable, to the recipient, from one sent anywhere else — which is the whole point.
 *
 * The consequence a developer has to design for: a person who has not approved messaging cannot
 * send, and this app cannot approve it for them. Their custody credential lives at their Home.
 * The refusal names the counterparty so the approval is one click, not a scavenger hunt.
 *
 * The wire itself is not a contact list. A named person's standing approval covers any named
 * agent; an org-scope entry covers current members. Exact addresses are leftovers from before
 * those classes existed, or a one-off for someone outside them.
 */

function joinEnglish(parts: string[]): string {
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0] ?? '';
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
}

/** What the wire actually covers — classes first, never a headcount of addresses. */
function wireCoverage(state: MessagingState): string | null {
  const communities = state.communities ?? [];
  const contacts = state.contacts ?? [];
  const scopes: string[] = [];
  if (state.namedToNamed) scopes.push('any agent with a public name');
  if (communities.length > 0) {
    scopes.push(`current members of ${joinEnglish(communities.map((c) => c.name))}`);
  }
  if (contacts.length === 1) scopes.push('one specific contact');
  if (contacts.length > 1) scopes.push(`${contacts.length} specific contacts`);
  if (scopes.length === 0) return null;
  if (state.namedToNamed || communities.length > 0) {
    return `Your agent may message ${joinEnglish(scopes)}. That is one standing approval — not one per person.`;
  }
  return `Your wire still names ${contacts.length} specific ${contacts.length === 1 ? 'person' : 'people'}. The next approval at your Home upgrades it to named agents and your communities — not one person at a time.`;
}
export function Messages({ org }: { org: { address: string; name: string } | null }) {
  const [state, setState] = useState<MessagingState | null>(null);
  const [inbox, setInbox] = useState<InboxEnvelope[]>([]);
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [text, setText] = useState('');
  const [error, setError] = useState<CommonsError | null>(null);
  /** A refusal that belongs to the INBOX alone — the send rail is independent and still works. */
  const [inboxRefusal, setInboxRefusal] = useState<CommonsError | null>(null);
  const [sent, setSent] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [memberOptions, setMemberOptions] = useState<MemberOption[]>([]);

  const load = useCallback(async () => {
    try {
      setState(await api.get<MessagingState>('/api/messaging'));
    } catch (e) {
      if (e instanceof CommonsError) setError(e);
    }
    try {
      const r = await api.get<{ envelopes?: InboxEnvelope[]; items?: InboxEnvelope[] }>('/api/inbox?preview=1');
      setInbox(r.envelopes ?? r.items ?? []);
      setInboxRefusal(null);
    } catch (e) {
      // Scoped to the inbox panel, not the page: the send rail is independent and still works.
      // And an empty list would be a lie about what is there — a refusal says so instead.
      setInbox([]);
      if (e instanceof CommonsError) setInboxRefusal(e);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // The community's roster as recipient suggestions. Each member is offered by the name that will
  // resolve: their public agent name when they hold one, else the name this org knows them by
  // (which the worker maps through the same directory). A refusal (not a member here) just means
  // no suggestions — typing an address or a public name still works.
  useEffect(() => {
    setMemberOptions([]);
    if (!org?.address) return;
    let cancelled = false;
    void api
      .get<{ members: { subject?: string; displayName?: string; localName?: string; publicName?: string }[] }>(
        `/api/members?org=${org.address}`,
      )
      .then((r) => {
        if (cancelled) return;
        setMemberOptions(
          r.members.flatMap((m) => {
            const local = m.localName || m.displayName || '';
            const value = m.publicName || local;
            if (!value) return [];
            return [{ value, hint: m.publicName && local ? `${local} in ${org.name}` : m.publicName ? '' : `in ${org.name}` }];
          }),
        );
      })
      .catch(() => { /* not admitted here — the picker stays empty, the input still takes anything */ });
    return () => { cancelled = true; };
  }, [org?.address, org?.name]);

  const send = async () => {
    const target = to.trim();
    if (!target || !text.trim()) return;
    setBusy(true);
    setError(null);
    setSent('');
    try {
      // A name is a facet. The worker maps it to a canonical address, then sends there.
      const to_ = /^0x[0-9a-fA-F]{40}$/.test(target) ? { address: target } : { agentName: target };
      const r = await api.post<{ messageId: string }>('/api/messaging/send', {
        ...to_,
        text: text.trim(),
        ...(subject.trim() ? { subject: subject.trim() } : {}),
        ...(org?.address ? { org: org.address } : {}),
      });
      setSent(r.messageId);
      setText('');
      await load();
    } catch (e) {
      if (e instanceof CommonsError) setError(e);
    } finally {
      setBusy(false);
    }
  };

  const coverage = state ? wireCoverage(state) : null;

  return (
    <>
      {error?.code === 'messaging_not_approved' ? (
        <div className="notice" style={{ marginBottom: 14 }}>
          <strong>Approve {to.trim() || 'this contact'} once</strong>
          <p style={{ margin: '4px 0 8px' }}>
            Your Home will sign, then bring you back here. Send again after that — Commons never
            holds the credential.
          </p>
          {error.ceremonyUrl && (
            <a href={error.ceremonyUrl}>
              Approve — then return here →
            </a>
          )}
        </div>
      ) : (
        error && <ErrorLine error={error} onDismiss={() => setError(null)} />
      )}

      <div className="panel">
        <h2>Send a message</h2>
        <div className="stack" style={{ marginTop: 10 }}>
          <input
            type="text"
            placeholder={
              org
                ? `a name in ${org.name}, a public agent name (nathan.impact), or a 0x address`
                : 'a public agent name (nathan.impact) or a 0x address'
            }
            value={to}
            onChange={(e) => setTo(e.target.value)}
            list="commons-recipient-options"
          />
          {memberOptions.length > 0 && (
            <datalist id="commons-recipient-options">
              {memberOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.hint}
                </option>
              ))}
            </datalist>
          )}
          <input type="text" placeholder="subject (optional)" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <textarea placeholder="Message…" value={text} onChange={(e) => setText(e.target.value)} />
          <div className="row">
            <button className="primary" onClick={send} disabled={busy || !to.trim() || !text.trim()}>
              {busy ? 'Sending…' : 'Send'}
            </button>
            {sent && <span className="muted">delivered · {sent.slice(0, 12)}…</span>}
          </div>
        </div>
        {coverage && (
          <p className="muted" style={{ marginTop: 10 }}>{coverage}</p>
        )}
      </div>

      <div className="panel">
        <h2>Inbox</h2>
        <p className="muted">Read from your Home, which holds your inbox — this app keeps no copy.</p>
        {inboxRefusal?.code === 'read_grant' ? (
          <div className="notice" style={{ marginTop: 10 }}>
            <strong>Authorize Commons to read your inbox once</strong>
            <p style={{ margin: '4px 0 8px' }}>
              Your messages live at your Home. Commons cannot see them until you sign a read-only
              grant for this app — and you can withdraw it for Commons alone.
            </p>
            {inboxRefusal.ceremonyUrl && (
              <a href={inboxRefusal.ceremonyUrl}>Authorize — then return here →</a>
            )}
          </div>
        ) : (
          inboxRefusal && <ErrorLine error={inboxRefusal} />
        )}
        <div style={{ marginTop: 10 }}>
          {!inboxRefusal && inbox.length === 0 && <Empty>Nothing here yet.</Empty>}
          {inbox.map((m, i) => (
            <div key={m.id ?? i} className="item">
              <div className="row">
                <strong>{m.subject || '(no subject)'}</strong>
                <span className="meta">{m.createdAt ? new Date(m.createdAt).toLocaleString() : ''}</span>
              </div>
              <p className="meta addr">{m.from ?? ''}</p>
              {(m.preview || m.bodyText) && <p className="post-body">{m.preview ?? m.bodyText}</p>}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
