import { useCallback, useEffect, useState } from 'react';
import type { Me, OrgSummary } from '../shared/api-types.js';
import { api, AppError } from './api.js';

interface HomeLinks {
  enableStorage: string;
  approveMessaging: string;
  organizations: string;
  connectedApps: string;
}

interface DemoIdentity {
  handle: string;
  name: string;
  sa: string;
  blurb: string;
  custodies: { sa: string; name: string }[];
}

export function App() {
  const [me, setMe] = useState<Me | null>(null);
  const [home, setHome] = useState<HomeLinks | null>(null);
  const [orgs, setOrgs] = useState<OrgSummary[]>([]);
  const [chain, setChain] = useState<{ chainId: number; network: string; contracts: Record<string, string> } | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const [booting, setBooting] = useState(true);

  const loadMe = useCallback(async () => {
    const r = await api.get<{ me: Me | null; home?: HomeLinks }>('/api/me');
    setMe(r.me);
    if (r.home) setHome(r.home);
    return r.me;
  }, []);

  const loadOrgs = useCallback(async (fresh = false) => {
    try {
      const r = await api.get<{ orgs: OrgSummary[] }>(`/api/orgs${fresh ? '?fresh=1' : ''}`);
      setOrgs(r.orgs);
    } catch (e) {
      if (e instanceof AppError) setError(e);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      let justConnected = false;
      if (code && state) {
        try {
          const r = await api.post<{ org?: { address: string } | null }>('/api/connect/callback', { code, state });
          justConnected = !!r.org;
        } catch (e) {
          if (e instanceof AppError) setError(e);
        }
        window.history.replaceState({}, '', window.location.pathname);
      }
      const who = await loadMe().catch(() => null);
      if (who) await loadOrgs(justConnected);
      const ch = await api.get<{ chainId: number; network: string; contracts: Record<string, string> }>('/api/chain').catch(() => null);
      if (ch) setChain(ch);
      setBooting(false);
    })();
  }, [loadMe, loadOrgs]);

  const signOut = async () => {
    await api.post('/api/logout');
    setMe(null);
    setOrgs([]);
  };

  if (booting) return <div className="shell muted">Loading…</div>;

  return (
    <div className="shell">
      <header className="top">
        <h1>__PROJECT_NAME__</h1>
        {me && (
          <span className="who">
            {me.agentName || 'signed in'} · <span className="addr">{me.person.slice(0, 10)}…</span>
            {' '}
            <button className="ghost" onClick={() => void signOut()}>Sign out</button>
          </span>
        )}
      </header>

      {error && <ErrorLine error={error} onDismiss={() => setError(null)} />}

      {!me ? (
        <Connect onError={setError} />
      ) : (
        <>
          <Identity me={me} home={home} />
          <Organizations orgs={orgs} home={home} onConnectOrg={setError} onRefresh={() => void loadOrgs(true)} />
          <BuildHint />
          {chain && <ChainFacts chain={chain} />}
        </>
      )}
    </div>
  );
}

function Connect({ onError }: { onError: (e: AppError) => void }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [demos, setDemos] = useState<DemoIdentity[]>([]);
  const [showDemos, setShowDemos] = useState(false);

  useEffect(() => {
    void api
      .get<{ identities: DemoIdentity[] }>('/api/connect/demo')
      .then((r) => setDemos(r.identities))
      .catch(() => setDemos([]));
  }, []);

  const start = async (template: 'site-login' | 'org-create' = 'site-login') => {
    setBusy(true);
    try {
      const r = await api.post<{ url: string }>('/api/connect/start', {
        agentName: name.trim(),
        template,
      });
      window.location.href = r.url;
    } catch (e) {
      if (e instanceof AppError) onError(e);
      setBusy(false);
    }
  };

  const demo = async (handle: string) => {
    setBusy(true);
    try {
      await api.post('/api/connect/demo', { handle });
      window.location.reload();
    } catch (e) {
      if (e instanceof AppError) onError(e);
      setBusy(false);
    }
  };

  return (
    <>
      <div className="panel">
        <h2>Connect with your Home</h2>
        <p className="muted">
          This app never sees a password, a passkey, or a private key. Your Home runs the ceremony
          and hands back a token that proves who you are — and authorizes nothing on its own.
        </p>
        <div className="stack" style={{ marginTop: 12, maxWidth: 420 }}>
          <input
            type="text"
            placeholder="agent name (optional) — e.g. nathan.impact"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void start();
            }}
          />
          <div className="row">
            <button className="primary" onClick={() => void start()} disabled={busy}>
              {busy ? 'Opening your Home…' : 'Continue'}
            </button>
            <span className="muted">no name yet? leave it blank</span>
          </div>
        </div>
      </div>
      {demos.length > 0 && (
        <div className="panel">
          <button className="ghost" onClick={() => setShowDemos((v) => !v)}>
            {showDemos ? 'Hide' : 'Show'} test identities
          </button>
          {showDemos && (
            <div className="stack" style={{ marginTop: 12 }}>
              {demos.map((d) => (
                <div className="item" key={d.handle}>
                  <div className="row">
                    <strong>{d.name}</strong>
                    <span className="badge">{d.handle}</span>
                    <button className="ghost" disabled={busy} onClick={() => void demo(d.handle)}>
                      Use
                    </button>
                  </div>
                  <p className="muted">{d.blurb}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

function Identity({ me, home }: { me: Me; home: HomeLinks | null }) {
  return (
    <div className="panel">
      <h2>You</h2>
      <p className="muted">The address is the identity. The name is a transferable facet.</p>
      <table className="facts">
        <tbody>
          <tr><td>address</td><td>{me.person}</td></tr>
          <tr><td>name</td><td>{me.agentName ?? '—'}</td></tr>
          <tr><td>issuer</td><td>{me.authOrigin}</td></tr>
          <tr>
            <td>vault</td>
            <td>
              {me.storage.granted ? 'enabled' : 'not enabled'}
              {!me.storage.granted && home && (
                <>
                  {' · '}
                  <a href={home.enableStorage} target="_blank" rel="noreferrer">enable at Home</a>
                </>
              )}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function Organizations({
  orgs,
  home,
  onConnectOrg,
  onRefresh,
}: {
  orgs: OrgSummary[];
  home: HomeLinks | null;
  onConnectOrg: (e: AppError) => void;
  onRefresh: () => void;
}) {
  const connectOrg = async () => {
    try {
      const r = await api.post<{ url: string }>('/api/connect/start', { template: 'org-create' });
      window.location.href = r.url;
    } catch (e) {
      if (e instanceof AppError) onConnectOrg(e);
    }
  };

  return (
    <div className="panel">
      <div className="row">
        <h2 style={{ margin: 0 }}>Organizations linked to this app</h2>
        <button className="ghost" onClick={() => void connectOrg()}>Connect one</button>
        <button className="ghost" onClick={onRefresh}>Refresh</button>
      </div>
      <p className="muted">
        Your app cannot mint an organization. The person does that at their Home. A stewardship
        wire is what lets you act for them — the hash is what a revoke names on-chain.
      </p>
      {orgs.length === 0 ? (
        <p className="muted" style={{ marginTop: 10 }}>None yet. Connect a community after sign-in.</p>
      ) : (
        orgs.map((o) => (
          <div className="item" key={o.address}>
            <div className="row">
              <strong>{o.name}</strong>
              {o.steward && <span className="badge">steward</span>}
              {!o.storage.granted && home && (
                <a href={home.enableStorage} target="_blank" rel="noreferrer">
                  enable storage
                </a>
              )}
            </div>
            <div className="addr">{o.address}</div>
            {o.delegationHash && <div className="addr">delegation {o.delegationHash}</div>}
          </div>
        ))
      )}
    </div>
  );
}

function BuildHint() {
  return (
    <div className="panel">
      <h2>Build your product here</h2>
      <p className="muted">
        Connect and authority are wired. Add routes in <code>apps/web/src/worker/index.ts</code> and
        views in <code>apps/web/src/ui</code>. Records go in the owner's vault via{' '}
        <code>interactions.call</code> — not a database. Read <code>docs/principles.md</code> and
        point Claude or Cursor at <code>AGENTS.md</code> before writing code.
      </p>
    </div>
  );
}

function ChainFacts({ chain }: { chain: { chainId: number; network: string; contracts: Record<string, string> } }) {
  const entries = Object.entries(chain.contracts);
  return (
    <div className="panel">
      <h2>Contracts on {chain.network}</h2>
      <p className="muted">
        Addresses from <code>@agenticprimitives/contracts</code> — the same artifact the gates read.
        Do not re-type them into a config file.
      </p>
      <table className="facts">
        <tbody>
          <tr><td>chainId</td><td>{chain.chainId}</td></tr>
          {entries.map(([k, v]) => (
            <tr key={k}>
              <td>{k}</td>
              <td>
                <a href={`https://sepolia.basescan.org/address/${v}`} target="_blank" rel="noreferrer">{v}</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ErrorLine({ error, onDismiss }: { error: AppError; onDismiss?: () => void }) {
  if (error.ceremonyUrl) {
    return (
      <div className="notice">
        <strong>One step is missing at your Home</strong>
        <p style={{ margin: '4px 0 8px' }}>{error.message}</p>
        <a href={error.ceremonyUrl} target="_blank" rel="noreferrer">Open your Home →</a>
      </div>
    );
  }
  return (
    <div className="notice">
      <span className="error">{error.message}</span>
      {onDismiss && (
        <button className="ghost" style={{ marginLeft: 8 }} onClick={onDismiss}>dismiss</button>
      )}
    </div>
  );
}
