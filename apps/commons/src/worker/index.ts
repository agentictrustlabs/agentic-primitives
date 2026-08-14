// Commons — the Worker.
//
// It does three jobs and nothing else:
//
//   1. Runs the OIDC handoff to the person's Home and holds the resulting id_token server-side.
//   2. Proxies the interactions rail, presenting that token plus, for org calls, the stewardship
//      delegation the Home issued. Never from the browser: the token is a bearer credential and
//      the live A2A worker is origin-locked, so a cross-origin fetch would fail AND leak.
//   3. Serves the SPA.
//
// It stores nothing. Every durable record — topics, posts, messages, library artifacts — lands
// in the OWNER's vault. If this Worker is deleted, no one loses anything.

import { Hono } from 'hono';
import { contentCommitment } from '@agenticprimitives/content-primitives';
import deployments from '@agenticprimitives/contracts/deployments-json/base-sepolia';
import { HomeConnectError } from '@starter/home-connect';
import { InteractionsError, type CallerAuth } from '@starter/interactions-client';
import type { LibraryEntry, Me, OrgSummary } from '../shared/api-types.js';
import { buildConfig, ConfigError, homeCeremonyUrls, type AppConfig, type Env } from './config.js';
import { delegationHashOf, findOrg, forgetOrgs, orgsFor } from './orgs.js';
import { cookieHeaders, readPending, readSession, seal, type SessionData } from './session.js';

type Vars = { cfg: AppConfig; session: SessionData | null };
const app = new Hono<{ Bindings: Env; Variables: Vars }>();

// The published package ships the addresses as a FLAT map (plus a `chainId`), so the addresses
// this app shows and the addresses the gates read come from the same artifact — nothing is
// re-typed into a config file here, where it could drift after a redeploy.
const DEPLOYED = deployments as Record<string, string | number>;
const CONTRACTS = Object.fromEntries(
  Object.entries(DEPLOYED).filter(([, v]) => typeof v === 'string' && /^0x[0-9a-fA-F]{40}$/.test(v)),
) as Record<string, string>;
const DELEGATION_MANAGER = CONTRACTS.delegationManager ?? '';

// ── Failure translation ───────────────────────────────────────────────────────────────────────
// Refusals from the substrate are typed and often name a CEREMONY the person can complete at
// their Home. Passing them through as "500 internal error" would be the single worst thing this
// app could do: it turns a two-click fix into an unexplained outage.
function toResponse(e: unknown, cfg: AppConfig | null): Response {
  const home = cfg ? homeCeremonyUrls(cfg.homeOrigin) : null;
  if (e instanceof ConfigError) {
    return Response.json({ error: e.message, code: 'misconfigured' }, { status: 500 });
  }
  if (e instanceof InteractionsError) {
    const ceremonyUrl =
      e.code === 'storage_not_enabled'
        ? (home?.enableStorage ?? undefined)
        : e.code === 'messaging_not_approved'
          ? (home?.enableMessaging ?? undefined)
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

// ── Middleware ────────────────────────────────────────────────────────────────────────────────
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

/** Every route below this needs a connected person. */
function required(session: SessionData | null): SessionData {
  if (!session) throw new InteractionsError('session_invalid', 'connect with your Home first');
  return session;
}

/** The credentials for an org-scoped call: the person's token + the org's stewardship wire. */
async function orgAuth(cfg: AppConfig, session: SessionData, orgAddress: string): Promise<CallerAuth> {
  const org = findOrg(await orgsFor(cfg, session), orgAddress);
  if (!org) {
    throw new InteractionsError(
      'not_authorized',
      'this organization is not linked to your account for this app — connect it first',
    );
  }
  return {
    session: session.idToken,
    // Absent when the person is a MEMBER rather than a steward. The call still goes through;
    // the gate decides on membership instead. Sending a wire we do not have would be a lie the
    // gate would catch anyway.
    ...(org.stewardshipDelegation ? { stewardship: org.stewardshipDelegation } : {}),
  };
}

// ── Health + identity ─────────────────────────────────────────────────────────────────────────
app.get('/health', (c) =>
  c.json({
    ok: true,
    service: 'commons',
    clientId: c.env.CLIENT_ID,
    a2a: c.env.A2A_BASE,
    home: c.env.HOME_ORIGIN,
    chainId: Number(c.env.CHAIN_ID || 84532),
  }),
);

/**
 * This app's public agent card.
 *
 * Serving one is what makes an app addressable BY agents rather than only by people. It is a
 * public document by construction: capabilities and endpoints, no authority claims — reading it
 * tells you how to talk to this app and nothing about who may.
 */
app.get('/.well-known/agent-card.json', (c) => {
  const origin = new URL(c.req.url).origin;
  return c.json({
    protocolVersion: '1.0',
    name: 'Commons',
    description: 'A community app: discussion topics, 1:1 messages, and a shared content library, all vault-resident.',
    version: '0.1.0',
    provider: { organization: 'Agentic Primitives Starter', url: origin },
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
    return c.json({ me, home: homeCeremonyUrls(cfg.homeOrigin) });
  } catch (e) {
    return toResponse(e, cfg);
  }
});

// ── Connect ───────────────────────────────────────────────────────────────────────────────────
app.post('/api/connect/start', async (c) => {
  const cfg = c.get('cfg');
  try {
    const body = (await c.req.json().catch(() => ({}))) as { agentName?: string; template?: 'site-login' | 'org-create' };
    const template = body.template === 'org-create' ? 'org-create' : 'site-login';
    const start = await cfg.connect.startConnect({
      ...(body.agentName ? { agentName: body.agentName } : {}),
      template,
      ...(template === 'org-create' ? { orgPurpose: 'commons:community' } : {}),
    });
    const pending = await seal(
      { state: start.state, nonce: start.nonce, codeVerifier: start.codeVerifier, authOrigin: start.authOrigin, template },
      cfg.sessionSecret,
    );
    return c.json(
      { url: start.url },
      { headers: { 'set-cookie': cookieHeaders(c.req.url).setPending(pending) } },
    );
  } catch (e) {
    return toResponse(e, cfg);
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
    const result = await cfg.connect.completeConnect({
      start: {
        url: '',
        state: pending.state,
        nonce: pending.nonce,
        codeVerifier: pending.codeVerifier,
        authOrigin: pending.authOrigin,
      },
      code,
      state,
    });

    // A fresh org from an `org-create` ceremony invalidates whatever we cached a moment ago.
    forgetOrgs(result.person);

    const session: SessionData = {
      idToken: result.idToken,
      person: result.person,
      agentName: result.agentName ?? null,
      authOrigin: result.authOrigin,
      exp: result.claims.exp,
    };
    const ttl = Math.max(60, result.claims.exp - Math.floor(Date.now() / 1000));
    const jar = cookieHeaders(c.req.url);
    const headers = new Headers();
    headers.append('set-cookie', jar.setSession(await seal(session, cfg.sessionSecret), ttl));
    headers.append('set-cookie', jar.clearPending());
    return c.json(
      {
        person: result.person,
        agentName: result.agentName ?? null,
        org: result.org ? { address: result.org.orgAgent, name: result.org.orgName } : null,
      },
      { headers },
    );
  } catch (e) {
    return toResponse(e, cfg);
  }
});

app.post('/api/logout', (c) =>
  c.json({ ok: true }, { headers: { 'set-cookie': cookieHeaders(c.req.url).clearSession() } }),
);

// ── Organizations ─────────────────────────────────────────────────────────────────────────────
app.get('/api/orgs', async (c) => {
  const cfg = c.get('cfg');
  try {
    const session = required(c.get('session'));
    const orgs = await orgsFor(cfg, session);
    // Storage status per org, in parallel — an org whose steward never enabled storage renders
    // with a one-click pointer to the ceremony instead of a broken topic list.
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
    return toResponse(e, cfg);
  }
});

// ── Discussion ────────────────────────────────────────────────────────────────────────────────
app.get('/api/topics', async (c) => {
  const cfg = c.get('cfg');
  try {
    const session = required(c.get('session'));
    const org = c.req.query('org') ?? '';
    const listing = await cfg.interactions.listTopics(org, await orgAuth(cfg, session, org));
    return c.json({
      topics: listing.topics.map((t) => ({
        id: t.id,
        title: t.title,
        createdBy: t.createdBy,
        participationPolicy: t.participationPolicy,
      })),
      you: listing.you,
      steward: listing.steward,
    });
  } catch (e) {
    return toResponse(e, cfg);
  }
});

app.post('/api/topics', async (c) => {
  const cfg = c.get('cfg');
  try {
    const session = required(c.get('session'));
    const body = (await c.req.json().catch(() => ({}))) as {
      org?: string;
      title?: string;
      participationPolicy?: 'open' | 'restricted';
    };
    const org = body.org ?? '';
    const title = String(body.title ?? '').trim();
    if (!title) return c.json({ error: 'title is required' }, 400);
    const r = await cfg.interactions.createTopic(
      org,
      { title, participationPolicy: body.participationPolicy ?? 'open' },
      await orgAuth(cfg, session, org),
    );
    return c.json(r);
  } catch (e) {
    return toResponse(e, cfg);
  }
});

app.get('/api/topics/:id', async (c) => {
  const cfg = c.get('cfg');
  try {
    const session = required(c.get('session'));
    const org = c.req.query('org') ?? '';
    const topic = await cfg.interactions.readTopic(org, c.req.param('id'), await orgAuth(cfg, session, org));
    if (!topic) return c.json({ error: 'no such topic' }, 404);
    return c.json({ topic });
  } catch (e) {
    return toResponse(e, cfg);
  }
});

app.post('/api/topics/:id/posts', async (c) => {
  const cfg = c.get('cfg');
  try {
    const session = required(c.get('session'));
    const body = (await c.req.json().catch(() => ({}))) as { org?: string; text?: string };
    const org = body.org ?? '';
    const text = String(body.text ?? '').trim();
    if (!text) return c.json({ error: 'text is required' }, 400);
    const r = await cfg.interactions.postToTopic(
      org,
      { topicId: c.req.param('id'), text },
      await orgAuth(cfg, session, org),
    );
    return c.json(r);
  } catch (e) {
    return toResponse(e, cfg);
  }
});

app.get('/api/members', async (c) => {
  const cfg = c.get('cfg');
  try {
    const session = required(c.get('session'));
    const org = c.req.query('org') ?? '';
    const members = await cfg.interactions.listMembers(org, await orgAuth(cfg, session, org));
    return c.json({ members });
  } catch (e) {
    return toResponse(e, cfg);
  }
});

// ── Messaging ─────────────────────────────────────────────────────────────────────────────────
app.get('/api/messaging', async (c) => {
  const cfg = c.get('cfg');
  try {
    const session = required(c.get('session'));
    const status = await cfg.interactions.messagingStatus(session.person, { session: session.idToken });
    return c.json({
      wirePresent: status.wirePresent,
      recipients: status.recipients,
      approveUrl: homeCeremonyUrls(cfg.homeOrigin).enableMessaging,
    });
  } catch (e) {
    return toResponse(e, cfg);
  }
});

app.post('/api/messaging/send', async (c) => {
  const cfg = c.get('cfg');
  try {
    const session = required(c.get('session'));
    const body = (await c.req.json().catch(() => ({}))) as {
      address?: string;
      agentName?: string;
      conversationId?: string;
      text?: string;
      subject?: string;
    };
    const text = String(body.text ?? '').trim();
    if (!text) return c.json({ error: 'text is required' }, 400);

    // ONE way to name the recipient, chosen by the caller. Trying an address, then a name, then a
    // conversation would eventually send the message to whoever happened to resolve (ADR-0013).
    const to = body.address
      ? { address: body.address }
      : body.agentName
        ? { agentName: body.agentName }
        : body.conversationId
          ? { conversationId: body.conversationId }
          : null;
    if (!to) return c.json({ error: 'name the recipient by address, agentName, or conversationId' }, 400);

    const r = await cfg.interactions.sendMessage(
      session.person,
      { to, text, ...(body.subject ? { subject: body.subject } : {}) },
      { session: session.idToken },
    );
    return c.json(r);
  } catch (e) {
    return toResponse(e, cfg);
  }
});

/**
 * The person's inbox, read at their Home.
 *
 * Read residency belongs to the Home, not to us: it holds the projection and the bodies, and it
 * answers only for the person whose token we forward. Proxied server-side so the token never
 * rides a cross-origin fetch.
 */
app.get('/api/inbox', async (c) => {
  const cfg = c.get('cfg');
  try {
    const session = required(c.get('session'));
    const out = new URL('/connect/inbox', session.authOrigin);
    for (const k of ['conversationId', 'preview', 'contextKind', 'contextId']) {
      const v = c.req.query(k);
      if (v) out.searchParams.set(k, v);
    }
    const r = await fetch(out.toString(), { headers: { authorization: `Bearer ${session.idToken}` } });
    const body = (await r.json().catch(() => ({}))) as Record<string, unknown>;

    // READING SOMEONE'S MAIL TAKES A GRANT THEY ISSUED, and this app does not have one until they
    // say so. The refusal travels back as a ceremony rather than an empty inbox: an empty list
    // would be a lie about what is there, and a 500 would be a lie about whose problem it is.
    const code = typeof body.code === 'string' ? body.code : '';
    if (code.startsWith('read_grant')) {
      return Response.json(
        {
          error:
            'This app has no grant to read your messages. You authorize it once at your Home, per app — ' +
            'and can withdraw it for this app alone.',
          code: 'read_grant',
          ceremonyUrl: homeCeremonyUrls(cfg.homeOrigin).connectedApps,
        },
        { status: 409 },
      );
    }
    return Response.json(body, { status: r.status });
  } catch (e) {
    return toResponse(e, cfg);
  }
});

// ── Library ───────────────────────────────────────────────────────────────────────────────────
app.get('/api/library', async (c) => {
  const cfg = c.get('cfg');
  try {
    const session = required(c.get('session'));
    const org = c.req.query('org') ?? '';
    const catalog = await cfg.interactions.listLibrary(org, await orgAuth(cfg, session, org));
    const entries: LibraryEntry[] = catalog.map((a) => ({
      id: a.id,
      name: a.name,
      kind: a.kind,
      folder: a.folder ?? '',
      contentType: a.contentType,
      ...(a.size !== undefined ? { size: a.size } : {}),
      ...(a.updatedAt ? { updatedAt: a.updatedAt } : {}),
      ...(a.isFolder ? { isFolder: true } : {}),
    }));
    return c.json({ entries });
  } catch (e) {
    return toResponse(e, cfg);
  }
});

app.get('/api/library/:id', async (c) => {
  const cfg = c.get('cfg');
  try {
    const session = required(c.get('session'));
    const org = c.req.query('org') ?? '';
    const record = await cfg.interactions.readArtifact(org, c.req.param('id'), await orgAuth(cfg, session, org));
    if (!record) return c.json({ error: 'no such artifact' }, 404);
    const b64 = typeof record.bytesB64 === 'string' ? record.bytesB64 : '';
    const text = b64 ? new TextDecoder().decode(Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0))) : '';
    return c.json({
      artifact: { ...record, bytesB64: undefined },
      text,
      // Recomputed on READ from the bytes we just received, and returned alongside the stored
      // one. If they differ, the bytes changed since the commitment was made — which is exactly
      // the question a content commitment exists to answer. We report both rather than assert.
      commitment: text ? contentCommitment(text).value : null,
      storedCommitment: typeof record.commitment === 'string' ? record.commitment : null,
    });
  } catch (e) {
    return toResponse(e, cfg);
  }
});

app.post('/api/library', async (c) => {
  const cfg = c.get('cfg');
  try {
    const session = required(c.get('session'));
    const body = (await c.req.json().catch(() => ({}))) as {
      org?: string;
      id?: string;
      name?: string;
      folder?: string;
      text?: string;
    };
    const org = body.org ?? '';
    const name = String(body.name ?? '').trim();
    const text = String(body.text ?? '');
    if (!name) return c.json({ error: 'name is required' }, 400);

    const id = body.id?.trim() || crypto.randomUUID();
    const bytes = new TextEncoder().encode(text);
    await cfg.interactions.putArtifact(
      org,
      {
        artifact: {
          id,
          kind: name.toLowerCase().endsWith('.ttl') ? 'ttl' : 'md',
          name,
          source: 'blob',
          folder: String(body.folder ?? ''),
          contentType: 'text/markdown',
          size: bytes.byteLength,
          // A SHA-256 commitment over the NORMALIZED text (`@agenticprimitives/content-primitives`).
          // Stored beside the bytes so any later reader can re-derive it and tell whether what
          // they got is what was published — without trusting this app to say so.
          ...({ commitment: contentCommitment(text).value } as Record<string, unknown>),
        },
        bytes,
      },
      await orgAuth(cfg, session, org),
    );
    return c.json({ artifactId: id });
  } catch (e) {
    return toResponse(e, cfg);
  }
});

app.delete('/api/library/:id', async (c) => {
  const cfg = c.get('cfg');
  try {
    const session = required(c.get('session'));
    const org = c.req.query('org') ?? '';
    await cfg.interactions.deleteArtifact(org, c.req.param('id'), await orgAuth(cfg, session, org));
    return c.json({ ok: true });
  } catch (e) {
    return toResponse(e, cfg);
  }
});

// ── Chain facts, for the "what is this actually running on" panel ──────────────────────────────
app.get('/api/chain', (c) =>
  c.json({
    chainId: Number(c.env.CHAIN_ID || 84532),
    network: 'base-sepolia',
    contracts: CONTRACTS,
  }),
);

// An unknown /api path is a 404 as JSON — never the SPA shell, which would hand a fetch() caller
// HTML and a 200 and turn a typo into an unexplained parse error.
app.all('/api/*', (c) => c.json({ error: 'no such route' }, 404));

// Everything else is the SPA. Assets that exist are served by the asset binding before the Worker
// runs; this handles deep links (`/topics/abc`) by returning the shell so the router can take over.
app.all('*', async (c) => {
  const shell = await c.env.ASSETS.fetch(new URL('/index.html', c.req.url).toString());
  return new Response(shell.body, {
    status: shell.status === 200 ? 200 : 404,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
});

export default app;
