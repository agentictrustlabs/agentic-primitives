import { useCallback, useEffect, useState } from 'react';
import type { Me, OrgSummary } from '../shared/api-types.js';
import { api, CommonsError } from './api.js';
import { Connect } from './views/Connect.js';
import { Discussion } from './views/Discussion.js';
import { Library } from './views/Library.js';
import { Members } from './views/Members.js';
import { Messages } from './views/Messages.js';
import { Substrate } from './views/Substrate.js';
import { CeremonyNotice, ErrorLine } from './views/parts.js';

type Tab = 'discussion' | 'messages' | 'library' | 'members' | 'substrate';

interface HomeLinks {
  enableStorage: string;
  enableMessaging: string;
  organizations: string;
  connectedApps: string;
  logout?: string;
}

export function App() {
  const [me, setMe] = useState<Me | null>(null);
  const [home, setHome] = useState<HomeLinks | null>(null);
  const [orgs, setOrgs] = useState<OrgSummary[]>([]);
  const [activeOrg, setActiveOrg] = useState<string>('');
  const [tab, setTab] = useState<Tab>('discussion');
  const [error, setError] = useState<CommonsError | null>(null);
  const [booting, setBooting] = useState(true);
  const [joinedName, setJoinedName] = useState<string | null>(null);
  const [joinedAs, setJoinedAs] = useState<string | null>(null);

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
      const fromInvite = params.get('n');
      const invitedOrg = (params.get('org') ?? '').toLowerCase();
      const invitedAgent = (params.get('agent') ?? '').trim().toLowerCase();
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const homeHandoff = hash.get('session');
      // Invite return (`n` / `org` / Home session) must survive the OIDC hop — the authorize
      // URL will not carry them, and replaceState below would otherwise forget the community
      // and drop the email home that just accepted.
      const INVITE_ORG = 'commons:invite-org';
      const INVITE_NAME = 'commons:invite-name';
      const INVITE_HOME = 'commons:home-session';
      const INVITE_AGENT = 'commons:invite-agent';
      try {
        if (fromInvite) sessionStorage.setItem(INVITE_NAME, fromInvite);
        if (invitedOrg) sessionStorage.setItem(INVITE_ORG, invitedOrg);
        if (homeHandoff) sessionStorage.setItem(INVITE_HOME, homeHandoff);
        if (invitedAgent) sessionStorage.setItem(INVITE_AGENT, invitedAgent);
      } catch {
        /* storage blocked */
      }
      let stashedOrg = invitedOrg;
      let stashedName = fromInvite;
      let stashedAgent = invitedAgent;
      try {
        stashedOrg = invitedOrg || sessionStorage.getItem(INVITE_ORG) || '';
        stashedName = fromInvite || sessionStorage.getItem(INVITE_NAME);
        stashedAgent = invitedAgent || sessionStorage.getItem(INVITE_AGENT) || '';
      } catch {
        /* storage blocked */
      }
      if (stashedName) setJoinedName(stashedName);
      // A ceremony just ran ⇒ read past the cache. An org connected two seconds ago must not be
      // invisible because some isolate learned "none" three seconds ago.
      let justConnected = false;
      if (code && state) {
        try {
          const r = await api.post<{ org?: { address: string } | null }>('/api/connect/callback', { code, state });
          justConnected = !!r.org;
        } catch (e) {
          if (e instanceof CommonsError) setError(e);
        }
      }
      if (code || state || fromInvite || invitedOrg) {
        window.history.replaceState({}, '', window.location.pathname);
      }
      const who = await loadMe().catch(() => null);
      if (!who && stashedName && !code) {
        // Invitee just accepted at Home. A nameless authorize is the generic chooser —
        // pin the claimed agent name, and only hop when we still have their Home session.
        let handoff = homeHandoff;
        try { handoff = homeHandoff || sessionStorage.getItem(INVITE_HOME); } catch { /* blocked */ }
        if (!handoff) {
          setBooting(false);
          return;
        }
        try {
          const r = await api.post<{ url: string }>('/api/connect/start', {
            ...(stashedAgent ? { agentName: stashedAgent } : {}),
          });
          window.location.href = `${r.url}#session=${encodeURIComponent(handoff)}&via=email`;
          return;
        } catch (e) {
          if (e instanceof CommonsError) setError(e);
        }
      }
      if (who) {
        await loadOrgs(justConnected || !!stashedName);
        if (stashedOrg) setActiveOrg(stashedOrg);
        try {
          sessionStorage.removeItem(INVITE_ORG);
          sessionStorage.removeItem(INVITE_NAME);
          sessionStorage.removeItem(INVITE_HOME);
          sessionStorage.removeItem(INVITE_AGENT);
        } catch {
          /* storage blocked */
        }
      }
      setBooting(false);
    })();
  }, [loadMe, loadOrgs]);

  const signOut = async () => {
    const dest = home?.logout;
    await api.post('/api/logout');
    if (dest) {
      window.location.href = dest;
      return;
    }
    setMe(null);
    setOrgs([]);
    setActiveOrg('');
  };

  // Home logout clears this cookie via /sso-logout. If that happened in another tab, drop the UI.
  useEffect(() => {
    if (!me) return;
    const check = async () => {
      try {
        const r = await api.get<{ me: Me | null }>('/api/me');
        if (!r.me) {
          setMe(null);
          setOrgs([]);
          setActiveOrg('');
        }
      } catch {
        /* a failed probe is not a logout */
      }
    };
    const onVis = () => {
      if (document.visibilityState === 'visible') void check();
    };
    document.addEventListener('visibilitychange', onVis);
    const t = window.setInterval(() => {
      if (document.visibilityState === 'visible') void check();
    }, 5_000);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.clearInterval(t);
    };
  }, [me]);

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
        <Connect joinedName={joinedName} />
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
        {(['discussion', 'messages', 'library', 'members', 'substrate'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} aria-current={tab === t ? 'page' : undefined}>
            {t === 'substrate' ? 'Under the hood' : t[0]!.toUpperCase() + t.slice(1)}
          </button>
        ))}
      </nav>

      {error && <ErrorLine error={error} onDismiss={() => setError(null)} />}

      {tab === 'discussion' && <Discussion org={org} />}
      {tab === 'messages' && <Messages org={org} />}
      {tab === 'library' && <Library org={org} />}
      {tab === 'members' && <Members org={org} />}
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

  // "None" is a claim about somebody else's records, so it comes with a way to check it and a
  // way to see what this app actually received — rather than a dead end that says try again.
  const emptyHelp = (
    <p className="muted" style={{ marginTop: 10, fontSize: 12 }}>
      Just connected one and still seeing this?{' '}
      <button className="link" onClick={() => window.location.reload()}>
        re-check
      </button>{' '}
      ·{' '}
      <a href="/api/diagnostics" target="_blank" rel="noreferrer">
        what this app can see
      </a>
    </p>
  );

  if (orgs.length === 0) {
    return (
      <div className="panel">
        <h2>No community connected</h2>
        <p className="muted">
          Discussion and the library belong to an <em>organization</em>. If you were just invited, the
          community should appear here after you sign in — do not use the button below for that.
          That ceremony is for a community <em>you steward</em> (or a new one your credential
          custodies). Sending a member through it is how you get <code>sender_mismatch</code>.
        </p>
        <div className="row" style={{ marginTop: 10 }}>
          <button className="primary" onClick={connectOrg} disabled={connecting}>
            {connecting ? 'Opening your Home…' : 'Create or link a community you steward'}
          </button>
          {homeUrl && (
            <a className="muted" href={homeUrl} target="_blank" rel="noreferrer">
              manage organizations at your Home →
            </a>
          )}
        </div>
        {emptyHelp}
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
        {current?.steward ? <span className="badge">steward</span> : <span className="badge">member</span>}
        {current && !current.storage.granted && <span className="badge">storage off</span>}
        {current?.steward && (
          <button className="ghost" onClick={connectOrg} disabled={connecting}>
            Connect another
          </button>
        )}
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
