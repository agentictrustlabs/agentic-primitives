import { useCallback, useEffect, useState } from 'react';
import type { Me, OrgSummary } from '../shared/api-types.js';
import { api, CommonsError } from './api.js';
import { Connect } from './views/Connect.js';
import { Discussion } from './views/Discussion.js';
import { Library } from './views/Library.js';
import { Messages } from './views/Messages.js';
import { Substrate } from './views/Substrate.js';
import { CeremonyNotice, ErrorLine } from './views/parts.js';

type Tab = 'discussion' | 'messages' | 'library' | 'substrate';

interface HomeLinks {
  enableStorage: string;
  enableMessaging: string;
  organizations: string;
  connectedApps: string;
}

export function App() {
  const [me, setMe] = useState<Me | null>(null);
  const [home, setHome] = useState<HomeLinks | null>(null);
  const [orgs, setOrgs] = useState<OrgSummary[]>([]);
  const [activeOrg, setActiveOrg] = useState<string>('');
  const [tab, setTab] = useState<Tab>('discussion');
  const [error, setError] = useState<CommonsError | null>(null);
  const [booting, setBooting] = useState(true);

  const loadMe = useCallback(async () => {
    const r = await api.get<{ me: Me | null; home?: HomeLinks }>('/api/me');
    setMe(r.me);
    if (r.home) setHome(r.home);
    return r.me;
  }, []);

  const loadOrgs = useCallback(async () => {
    try {
      const r = await api.get<{ orgs: OrgSummary[] }>('/api/orgs');
      setOrgs(r.orgs);
      setActiveOrg((cur) => cur || (r.orgs[0]?.address ?? ''));
    } catch (e) {
      // An org list that fails is not a reason to blank the whole app — the person is still
      // connected and messaging still works. Surface it and carry on.
      if (e instanceof CommonsError) setError(e);
    }
  }, []);

  // Boot: finish a connect if the Home just redirected back here, then load state.
  useEffect(() => {
    void (async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      if (code && state) {
        try {
          await api.post('/api/connect/callback', { code, state });
        } catch (e) {
          if (e instanceof CommonsError) setError(e);
        }
        // Strip the code from the URL whether it worked or not — a code is single-use, and
        // leaving it in the address bar invites a reload that fails confusingly.
        window.history.replaceState({}, '', window.location.pathname);
      }
      const who = await loadMe().catch(() => null);
      if (who) await loadOrgs();
      setBooting(false);
    })();
  }, [loadMe, loadOrgs]);

  const signOut = async () => {
    await api.post('/api/logout');
    setMe(null);
    setOrgs([]);
    setActiveOrg('');
  };

  if (booting) {
    return (
      <div className="shell">
        <p className="muted">Loading…</p>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="shell">
        <Header me={null} />
        {error && <ErrorLine error={error} />}
        <Connect />
      </div>
    );
  }

  const org = orgs.find((o) => o.address === activeOrg) ?? null;

  return (
    <div className="shell">
      <Header me={me} onSignOut={signOut} />

      {!me.storage.granted && home && (
        <CeremonyNotice
          url={home.enableStorage}
          title="Your agent's storage is not enabled yet"
          body="Messages and records live in your own encrypted vault, reached through a delegation you sign. Turn it on once at your Home — nothing here can do it for you, and that is the point."
        />
      )}

      <OrgPicker orgs={orgs} active={activeOrg} onPick={setActiveOrg} homeUrl={home?.organizations ?? null} />

      <nav className="tabs">
        {(['discussion', 'messages', 'library', 'substrate'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} aria-current={tab === t ? 'page' : undefined}>
            {t === 'substrate' ? 'Under the hood' : t[0]!.toUpperCase() + t.slice(1)}
          </button>
        ))}
      </nav>

      {error && <ErrorLine error={error} onDismiss={() => setError(null)} />}

      {tab === 'discussion' && <Discussion org={org} />}
      {tab === 'messages' && <Messages />}
      {tab === 'library' && <Library org={org} />}
      {tab === 'substrate' && <Substrate me={me} orgs={orgs} />}
    </div>
  );
}

function Header({ me, onSignOut }: { me: Me | null; onSignOut?: () => void }) {
  return (
    <header className="top">
      <h1>Commons</h1>
      <span className="muted">discussion · messages · library</span>
      {me && (
        <span className="who">
          {me.agentName ?? 'unnamed agent'} · <span className="addr">{me.person.slice(0, 10)}…</span>{' '}
          <button className="link" onClick={onSignOut}>
            sign out
          </button>
        </span>
      )}
    </header>
  );
}

function OrgPicker({
  orgs,
  active,
  onPick,
  homeUrl,
}: {
  orgs: OrgSummary[];
  active: string;
  onPick: (a: string) => void;
  homeUrl: string | null;
}) {
  const [connecting, setConnecting] = useState(false);

  // Connecting an organization is an `org-create` ceremony AT THE HOME: the person picks one they
  // already steward, or names a new one that their own credential custodies. This app cannot
  // deploy an organization, and would be the wrong party to.
  const connectOrg = async () => {
    setConnecting(true);
    const r = await api.post<{ url: string }>('/api/connect/start', { template: 'org-create' });
    window.location.href = r.url;
  };

  if (orgs.length === 0) {
    return (
      <div className="panel">
        <h2>No community connected</h2>
        <p className="muted">
          Discussion and the library belong to an <em>organization</em> — a Smart Agent your own credential
          custodies. Connect one and this app becomes its front end; the records stay in its vault.
        </p>
        <div className="row" style={{ marginTop: 10 }}>
          <button className="primary" onClick={connectOrg} disabled={connecting}>
            {connecting ? 'Opening your Home…' : 'Connect a community'}
          </button>
          {homeUrl && (
            <a className="muted" href={homeUrl} target="_blank" rel="noreferrer">
              manage organizations at your Home →
            </a>
          )}
        </div>
      </div>
    );
  }

  const current = orgs.find((o) => o.address === active);
  return (
    <div className="panel">
      <div className="row">
        <label htmlFor="org" className="muted">
          Community
        </label>
        <select id="org" value={active} onChange={(e) => onPick(e.target.value)} style={{ maxWidth: 320 }}>
          {orgs.map((o) => (
            <option key={o.address} value={o.address}>
              {o.name}
            </option>
          ))}
        </select>
        {current?.steward && <span className="badge">steward</span>}
        {current && !current.storage.granted && <span className="badge">storage off</span>}
        <button className="ghost" onClick={connectOrg} disabled={connecting}>
          Connect another
        </button>
      </div>
      {current && !current.storage.granted && (
        <p className="muted" style={{ marginTop: 8 }}>
          This community has not enabled its interactions storage. A steward enables it once at their Home;
          until then it has nowhere to keep topics or artifacts.
        </p>
      )}
    </div>
  );
}
