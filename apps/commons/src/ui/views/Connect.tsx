import { useState } from 'react';
import { api, CommonsError } from '../api.js';
import { ErrorLine } from './parts.js';

/**
 * The sign-in screen.
 *
 * There is no password field, no wallet button, and no "create account" — deliberately. This app
 * runs no credential ceremony, holds no secret of yours, and cannot create an identity. It sends
 * you to your Home, which does all three, and gets back a token that says who you are.
 *
 * The name box is optional because it only decides WHICH Home to open: a person with a claimed
 * name has their own (`<name>.impact-agent.me`); everyone else starts at the apex and onboards.
 */
export function Connect() {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<CommonsError | null>(null);

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await api.post<{ url: string }>('/api/connect/start', { agentName: name.trim() });
      window.location.href = r.url;
    } catch (e) {
      if (e instanceof CommonsError) setError(e);
      setBusy(false);
    }
  };

  return (
    <>
      <div className="panel">
        <h2>Connect with your Home</h2>
        <p className="muted">
          Commons never sees a password, a passkey, or a private key. Your Home runs the ceremony and hands
          this app one short-lived token that proves who you are — and authorizes nothing on its own.
        </p>
        <div className="stack" style={{ marginTop: 12, maxWidth: 420 }}>
          <input
            type="text"
            placeholder="your agent name (optional) — e.g. nathan.impact"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void start();
            }}
          />
          <div className="row">
            <button className="primary" onClick={start} disabled={busy}>
              {busy ? 'Opening your Home…' : 'Continue'}
            </button>
            <span className="muted">no name yet? leave it blank</span>
          </div>
        </div>
        {error && <ErrorLine error={error} />}
      </div>

      <div className="panel">
        <h3>What happens next</h3>
        <ol className="muted" style={{ margin: '6px 0 0', paddingLeft: 18 }}>
          <li>Your Home verifies you — passkey, wallet, or Google — on its own origin.</li>
          <li>It returns a one-time code here, which this app&apos;s server exchanges for an id_token.</li>
          <li>
            The token lives in an <code>httpOnly</code> cookie. No script on this page can read it, and it
            never leaves this app&apos;s server.
          </li>
          <li>
            Anything that touches an organization also carries a delegation <em>that organization signed</em>,
            checked on-chain at every gate.
          </li>
        </ol>
      </div>
    </>
  );
}
