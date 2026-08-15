// __PROJECT_NAME__ — the Worker.
//
// Three jobs: OIDC handoff to the person's Home, proxy the interactions rail, serve the SPA.
// It stores nothing. Add product routes below the org helpers. Records go in the owner's vault.

import { Hono } from 'hono';
import deployments from '@agenticprimitives/contracts/deployments-json/base-sepolia';
import { HomeConnectError } from '@starter/home-connect';
import { InteractionsError, type CallerAuth } from '@starter/interactions-client';
import type { Me, OrgSummary } from '../shared/api-types.js';
import { buildConfig, ConfigError, homeCeremonyUrls, type AppConfig, type Env } from './config.js';
import { delegationHashOf, findOrg, forgetOrgs, mergeCeremonyOrg, orgsFor } from './orgs.js';
import {
  cookieHeaders,
  readCeremonyOrg,
  readPending,
  readSession,
  seal,
  SESSION_VERSION,
  type CeremonyOrg,
  type SessionData,
} from './session.js';

type Vars = { cfg: AppConfig; session: SessionData | null };
const app = new Hono<{ Bindings: Env; Variables: Vars }>();

const DEPLOYED = deployments as Record<string, string | number>;
const CONTRACTS = Object.fromEntries(
  Object.entries(DEPLOYED).filter(([, v]) => typeof v === 'string' && /^0x[0-9a-fA-F]{40}$/.test(v)),
) as Record<string, string>;
const DELEGATION_MANAGER = CONTRACTS.delegationManager ?? '';

function toResponse(
  e: unknown,
  cfg: AppConfig | null,
  ctx: { org?: string; homeSession?: string } = {},
): Response {
  const home = cfg
    ? homeCeremonyUrls(cfg.homeOrigin, {
        returnTo: cfg.redirectUri,
        ...(ctx.org ? { org: ctx.org } : {}),
        ...(ctx.homeSession ? { homeSession: ctx.homeSession } : {}),
      })
    : null;
  if (e instanceof ConfigError) {
    return Response.json({ error: e.message, code: 'misconfigured' }, { status: 500 });
  }
  if (e instanceof InteractionsError) {
    const ceremonyUrl =
      e.code === 'storage_not_enabled'
        ? (home?.enableStorage ?? undefined)
        : e.code === 'messaging_not_approved'
          ? (home?.approveMessaging ?? undefined)
          : e.code === 'read_grant'
            ? (home?.connectedApps ?? undefined)
            : undefined;
    const status =
      e.code === 'session_invalid' ? 401 : e.code === 'unreachable' || e.code === 'server_error' ? 502 : 409;
    return Response.json({ error: e.message, code: e.code, ceremonyUrl }, { status });
  }
  if (e instanceof HomeConnectError) {
    return Response.json({ error: e.message, code: e.code }, { status: 400 });
  }
  return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
}

app.use('/api/*', async (c, next) => {
  let cfg: AppConfig;
  try {
    cfg = buildConfig(c.env);
  } catch (e) {
    return toResponse(e, null);
  }
  c.set('cfg', cfg);
  c.set('session', await readSession(c.req.raw, cfg.sessionSecret));
  await next();
});

function handoffOf(c: { get: (k: 'session') => SessionData | null }): { homeSession?: string } {
  const s = c.get('session');
  return s?.homeSession ? { homeSession: s.homeSession } : {};
}

function required(session: SessionData | null): SessionData {
  if (!session) throw new InteractionsError('session_invalid', 'connect with your Home first');
  return session;
}

async function resolveOrgs(cfg: AppConfig, c: { req: { raw: Request } }, session: SessionData, fresh = false) {
  const ceremony = await readCeremonyOrg(c.req.raw, cfg.sessionSecret);
  return mergeCeremonyOrg(await orgsFor(cfg, session, { fresh }), ceremony);
}

/** Credentials for an org-scoped call. Use this when you add vault writes. */
export async function orgAuth(
  cfg: AppConfig,
  c: { req: { raw: Request } },
  session: SessionData,
  orgAddress: string,
): Promise<CallerAuth> {
  const org = findOrg(await resolveOrgs(cfg, c, session), orgAddress);
  if (!org) {
    throw new InteractionsError(
      'not_authorized',
      'this organization is not linked to your account for this app — connect it first',
    );
  }
  return {
    session: session.idToken,
    ...(org.stewardshipDelegation ? { stewardship: org.stewardshipDelegation } : {}),
  };
}

app.get('/health', (c) =>
  c.json({
    ok: true,
    service: '__PACKAGE_NAME__',
    clientId: c.env.CLIENT_ID,
    a2a: c.env.A2A_BASE,
    home: c.env.HOME_ORIGIN,
    chainId: Number(c.env.CHAIN_ID || 84532),
  }),
);

app.get('/.well-known/agent-card.json', (c) => {
  const origin = new URL(c.req.url).origin;
  return c.json({
    protocolVersion: '1.0',
    name: '__PROJECT_NAME__',
    description: 'An app on the Agentic Primitives substrate.',
    version: '0.1.0',
    provider: { organization: '__PROJECT_NAME__', url: origin },
    supportedInterfaces: [{ url: `${origin}/api`, protocolBinding: 'HTTP' }],
    capabilities: { streaming: false, pushNotifications: false, stateTransitionHistory: false },
    skills: [],
    chainId: Number(c.env.CHAIN_ID || 84532),
  });
});

app.get('/api/me', async (c) => {
  const cfg = c.get('cfg');
  const session = c.get('session');
  if (!session) return c.json({ me: null });
  try {
    const storage = await cfg.interactions.status(session.person);
    const me: Me = {
      person: session.person,
      agentName: session.agentName,
      authOrigin: session.authOrigin,
      storage: { granted: storage.granted, current: storage.current },
    };
    return c.json({
      me,
      home: homeCeremonyUrls(cfg.homeOrigin, {
        returnTo: cfg.redirectUri,
        ...(session.homeSession ? { homeSession: session.homeSession } : {}),
      }),
    });
  } catch (e) {
    return toResponse(e, cfg, handoffOf(c));
  }
});

app.post('/api/connect/start', async (c) => {
  const cfg = c.get('cfg');
  try {
    const body = (await c.req.json().catch(() => ({}))) as { agentName?: string; template?: 'site-login' | 'org-create' };
    const template = body.template === 'org-create' ? 'org-create' : 'site-login';
    const start = await cfg.connect.startConnect({
      ...(body.agentName ? { agentName: body.agentName } : {}),
      template,
      ...(template === 'org-create' ? { orgPurpose: '__PACKAGE_NAME__' } : {}),
    });
    const pending = await seal(
      { state: start.state, nonce: start.nonce, codeVerifier: start.codeVerifier, authOrigin: start.authOrigin, template },
      cfg.sessionSecret,
    );
    const session = c.get('session');
    const url = session?.homeSession
      ? `${start.url}#session=${encodeURIComponent(session.homeSession)}`
      : start.url;
    return c.json({ url }, { headers: { 'set-cookie': cookieHeaders(c.req.url).setPending(pending) } });
  } catch (e) {
    return toResponse(e, cfg, handoffOf(c));
  }
});

app.post('/api/connect/callback', async (c) => {
  const cfg = c.get('cfg');
  try {
    const { code, state } = (await c.req.json().catch(() => ({}))) as { code?: string; state?: string };
    if (!code || !state) return c.json({ error: 'code and state are required' }, 400);
    const pending = await readPending(c.req.raw, cfg.sessionSecret);
    if (!pending) {
      return c.json({ error: 'no connect in progress — start again', code: 'state_mismatch' }, 400);
    }
    const existing = c.get('session');
    const result = await cfg.connect.completeConnect({
      start: {
        url: '',
        state: pending.state,
        nonce: pending.nonce,
        codeVerifier: pending.codeVerifier,
        authOrigin: pending.authOrigin,
        template: pending.template,
      },
      code,
      state,
    });

    const jar = cookieHeaders(c.req.url);
    const headers = new Headers();
    headers.append('set-cookie', jar.clearPending());

    if (result.subjectKind === 'organization') {
      if (!existing) {
        return c.json(
          { error: 'sign in with your Home before connecting a community', code: 'session_required' },
          409,
        );
      }
      const ceremony: CeremonyOrg = {
        address: result.subject,
        name: result.org?.orgName || result.agentName || 'Organization',
        ...(result.org?.stewardshipDelegation ? { stewardship: result.org.stewardshipDelegation } : {}),
        at: Date.now(),
      };
      const ttl = Math.max(60, existing.exp - Math.floor(Date.now() / 1000));
      const cookie = jar.setOrg(await seal(ceremony, cfg.sessionSecret), ttl);
      if (cookie) headers.append('set-cookie', cookie);
      forgetOrgs(existing.person);
      return c.json(
        {
          person: existing.person,
          agentName: existing.agentName,
          org: { address: ceremony.address, name: ceremony.name },
          stewardship: !!ceremony.stewardship,
        },
        { headers },
      );
    }

    forgetOrgs(result.subject);
    const session: SessionData = {
      v: SESSION_VERSION,
      idToken: result.idToken,
      person: result.subject,
      agentName: result.agentName ?? null,
      authOrigin: result.authOrigin,
      exp: result.claims.exp,
    };
    const ttl = Math.max(60, result.claims.exp - Math.floor(Date.now() / 1000));
    headers.append('set-cookie', jar.setSession(await seal(session, cfg.sessionSecret), ttl));
    if (existing && existing.person !== session.person) headers.append('set-cookie', jar.clearOrg());
    return c.json({ person: session.person, agentName: session.agentName, org: null }, { headers });
  } catch (e) {
    return toResponse(e, cfg, handoffOf(c));
  }
});

app.get('/api/connect/demo', async (c) => {
  const cfg = c.get('cfg');
  const identities = await cfg.connect.listDemoIdentities();
  return c.json({
    identities: identities.map((i) => ({
      handle: i.handle,
      name: i.name,
      sa: i.sa,
      blurb: i.blurb,
      custodies: (i.custodies ?? []).map((o) => ({ sa: o.sa, name: o.name ?? o.sa })),
    })),
  });
});

app.post('/api/connect/demo', async (c) => {
  const cfg = c.get('cfg');
  try {
    const { handle } = (await c.req.json().catch(() => ({}))) as { handle?: string };
    if (!handle) return c.json({ error: 'handle is required' }, 400);
    const result = await cfg.connect.connectAsDemo(handle);
    const session: SessionData = {
      v: SESSION_VERSION,
      idToken: result.idToken,
      person: result.subject,
      agentName: result.agentName ?? null,
      authOrigin: result.authOrigin,
      ...(result.homeSession ? { homeSession: result.homeSession } : {}),
      exp: result.claims.exp,
    };
    forgetOrgs(session.person);
    const ttl = Math.max(60, result.claims.exp - Math.floor(Date.now() / 1000));
    const jar = cookieHeaders(c.req.url);
    const headers = new Headers();
    headers.append('set-cookie', jar.setSession(await seal(session, cfg.sessionSecret), ttl));
    headers.append('set-cookie', jar.clearOrg());
    return c.json({ person: session.person, agentName: session.agentName }, { headers });
  } catch (e) {
    return toResponse(e, cfg, handoffOf(c));
  }
});

app.post('/api/logout', (c) => {
  const jar = cookieHeaders(c.req.url);
  const headers = new Headers();
  headers.append('set-cookie', jar.clearSession());
  headers.append('set-cookie', jar.clearOrg());
  return c.json({ ok: true }, { headers });
});

app.get('/api/orgs', async (c) => {
  const cfg = c.get('cfg');
  try {
    const session = required(c.get('session'));
    const orgs = await resolveOrgs(cfg, c, session, c.req.query('fresh') === '1');
    const out: OrgSummary[] = await Promise.all(
      orgs.map(async (o) => {
        const status = await cfg.interactions
          .status(o.orgAgent)
          .catch(() => ({ granted: false, current: false, deliveryGranted: false }));
        const hash = delegationHashOf(o.stewardshipDelegation, cfg.chainId, DELEGATION_MANAGER);
        return {
          address: String(o.orgAgent).toLowerCase(),
          name: o.orgName || 'Organization',
          steward: !!o.stewardshipDelegation,
          ...(hash ? { delegationHash: hash } : {}),
          storage: { granted: status.granted, current: status.current },
        };
      }),
    );
    return c.json({ orgs: out });
  } catch (e) {
    return toResponse(e, cfg, handoffOf(c));
  }
});

app.get('/api/chain', (c) =>
  c.json({
    chainId: Number(c.env.CHAIN_ID || 84532),
    network: 'base-sepolia',
    contracts: CONTRACTS,
  }),
);

// Add product routes here. Example — a vault write:
//
//   app.post('/api/topics', async (c) => {
//     const cfg = c.get('cfg');
//     const session = required(c.get('session'));
//     const { org, title } = await c.req.json();
//     const r = await cfg.interactions.createTopic(org, { title }, await orgAuth(cfg, c, session, org));
//     return c.json(r);
//   });
//
// A refusal is usually a missing ceremony. Pass it through toResponse — never retry, never fake success.

app.all('/api/*', (c) => c.json({ error: 'no such route' }, 404));

app.all('*', async (c) => {
  const shell = await c.env.ASSETS.fetch(new URL('/index.html', c.req.url).toString());
  return new Response(shell.body, {
    status: shell.status === 200 ? 200 : 404,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
});

export default app;
