import { useCallback, useEffect, useState } from 'react';
import type { MessagingState } from '../../shared/api-types.js';
import { api, CommonsError } from '../api.js';
import { CeremonyNotice, Empty, ErrorLine } from './parts.js';

interface InboxEnvelope {
  id?: string;
  conversationId?: string;
  subject?: string;
  from?: string;
  createdAt?: string;
  preview?: string;
  bodyText?: string;
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
 */
export function Messages() {
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

  const send = async () => {
    const target = to.trim();
    if (!target || !text.trim()) return;
    setBusy(true);
    setError(null);
    setSent('');
    try {
      // The caller picks HOW the recipient is named: a `0x…` is an address, anything else is an
      // agent name the substrate resolves on-chain. One selection, never a chain of attempts.
      const to_ = /^0x[0-9a-fA-F]{40}$/.test(target) ? { address: target } : { agentName: target };
      const r = await api.post<{ messageId: string }>('/api/messaging/send', {
        ...to_,
        text: text.trim(),
        ...(subject.trim() ? { subject: subject.trim() } : {}),
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

  return (
    <>
      {state && !state.wirePresent && (
        <CeremonyNotice
          url={state.approveUrl}
          title="Messaging is not approved yet"
          body="Approving your agent to send on your behalf takes your own credential, which lives at your Home and never here. One signature, once per new contact."
        />
      )}
      {error && <ErrorLine error={error} onDismiss={() => setError(null)} />}

      <div className="panel">
        <h2>Send a message</h2>
        <div className="stack" style={{ marginTop: 10 }}>
          <input
            type="text"
            placeholder="recipient — an agent name (nathan.impact) or a 0x address"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
          <input type="text" placeholder="subject (optional)" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <textarea placeholder="Message…" value={text} onChange={(e) => setText(e.target.value)} />
          <div className="row">
            <button className="primary" onClick={send} disabled={busy || !to.trim() || !text.trim()}>
              {busy ? 'Sending…' : 'Send'}
            </button>
            {sent && <span className="muted">delivered · {sent.slice(0, 12)}…</span>}
          </div>
        </div>
        {state && state.recipients.length > 0 && (
          <p className="muted" style={{ marginTop: 10 }}>
            Your wire currently covers {state.recipients.length} approved{' '}
            {state.recipients.length === 1 ? 'contact' : 'contacts'}. Sending to anyone else is refused until
            you approve them at your Home.
          </p>
        )}
      </div>

      <div className="panel">
        <h2>Inbox</h2>
        <p className="muted">Read from your Home, which holds your inbox — this app keeps no copy.</p>
        {inboxRefusal && <ErrorLine error={inboxRefusal} />}
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
