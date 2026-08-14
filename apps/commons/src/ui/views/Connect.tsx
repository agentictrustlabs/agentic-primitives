import { useEffect, useState } from 'react';
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
interface DemoIdentity {
  handle: string;
  name: string;
  sa: string;
  blurb: string;
  custodies: { sa: string; name: string }[];
}

export function Connect() {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<CommonsError | null>(null);
  const [demos, setDemos] = useState<DemoIdentity[]>([]);
  const [showDemos, setShowDemos] = useState(false);

  // Asked once, and the ANSWER decides whether the pane exists. A Home that offers none returns
  // an empty list, so the affordance disappears without this app shipping a flag for it.
  useEffect(() => {
    void api
      .get<{ identities: DemoIdentity[] }>('/api/connect/demo')
      .then((r) => setDemos(r.identities))
      .catch(() => setDemos([]));
  }, []);

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

      {demos.length > 0 && <DemoPane identities={demos} open={showDemos} onToggle={() => setShowDemos((v) => !v)} />}

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

/**
 * Shared test identities, behind a disclosure.
 *
 * COLLAPSED BY DEFAULT and never auto-opened. These are real Smart Agents whose custodian the
 * Home holds — anyone who opens this can act as them — so they belong out of the way of somebody
 * signing in as themselves, present for whoever is deliberately looking.
 *
 * It is not a "demo mode". Connecting as one produces the same session, the same cookie and the
 * same verification as any other sign-in; an app with a second, weaker session path would be an
 * app whose real path is untested. What it saves is the credential ceremony, not the authority.
 */
function DemoPane({
  identities,
  open,
  onToggle,
}: {
  identities: DemoIdentity[];
  open: boolean;
  onToggle: () => void;
}) {
  const [busy, setBusy] = useState<string>('');
  const [error, setError] = useState<CommonsError | null>(null);

  const connect = async (handle: string) => {
    setBusy(handle);
    setError(null);
    try {
      await api.post('/api/connect/demo', { handle });
      window.location.href = '/';
    } catch (e) {
      if (e instanceof CommonsError) setError(e);
      setBusy('');
    }
  };

  return (
    <div className="panel">
      <button
        className="link"
        onClick={onToggle}
        aria-expanded={open}
        style={{ font: 'inherit', fontSize: 13 }}
      >
        {open ? '▾' : '▸'} Test identities this Home offers ({identities.length})
      </button>

      {open && (
        <div style={{ marginTop: 12 }}>
          <p className="muted">
            Shared accounts whose key this Home holds. They are real Smart Agents with real vaults and
            real organizations — so everything you do as one produces a genuine signature and a genuine
            on-chain check. Anyone can connect as them; that is what a shared account means.
          </p>
          {error && <ErrorLine error={error} onDismiss={() => setError(null)} />}
          <div style={{ marginTop: 10 }}>
            {identities.map((d) => (
              <div key={d.handle} className="item">
                <div className="row">
                  <button className="ghost" disabled={!!busy} onClick={() => void connect(d.handle)}>
                    {busy === d.handle ? 'Connecting…' : `Connect as ${d.name}`}
                  </button>
                  {d.custodies.length > 0 && (
                    <span className="muted" style={{ fontSize: 12 }}>
                      stewards {d.custodies.map((o) => o.name).join(', ')}
                    </span>
                  )}
                </div>
                <p className="meta addr">{d.sa}</p>
              </div>
            ))}
          </div>
          <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
            Sign-in, identity and messaging work immediately as any of these. <strong>Discussion and the
            library will not</strong> until you connect a community here — and that ceremony runs at the
            Home, which these shared accounts have no keyless route into, so it needs a browser sign-in
            there first. Said plainly rather than left to be discovered: the org surfaces are the ones a
            shared account cannot reach on its own today.
          </p>
        </div>
      )}
    </div>
  );
}
