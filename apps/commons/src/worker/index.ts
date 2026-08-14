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
function toResponse(
  e: unknown,
  cfg: AppConfig | null,
  ctx: { org?: string; homeSession?: string } = {},
): Response {
  // `return` sends the person straight back here once the ceremony finishes, and `org` makes the
  // Home provision that organization's grants too — without it, a steward enables only their own.
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

/**
 * The Home-session handoff for whoever is signed in, if any.
 *
 * Read from the request rather than threaded through every call site, because a ceremony link is
 * built at the point of failure and that is exactly where the session is least in scope.
 */
function handoffOf(c: { get: (k: 'session') => SessionData | null }): { homeSession?: string } {
  const s = c.get('session');
  return s?.homeSession ? { homeSession: s.homeSession } : {};
}

/** Every route below this needs a connected person. */
function required(session: SessionData | null): SessionData {
  if (!session) throw new InteractionsError('session_invalid', 'connect with your Home first');
  return session;
}

/**
 * Every organization this person can act on here: the Home's scoped list, plus the one a
 * ceremony just handed us. See `mergeCeremonyOrg` for why both.
 */
async function resolveOrgs(cfg: AppConfig, c: { req: { raw: Request } }, session: SessionData, fresh = false) {
  const ceremony = await readCeremonyOrg(c.req.raw, cfg.sessionSecret);
  return mergeCeremonyOrg(await orgsFor(cfg, session, { fresh }), ceremony);
}

/** The credentials for an org-scoped call: the person's token + the org's stewardship wire. */
async function orgAuth(
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

    /*
      AN org-create TOKEN IS NOT A PERSON SESSION.

      The Home mints `sub` from the DELEGATOR of the delegation the ceremony submitted. For
      `site-login` that is the person; for `org-create` the submitted grant is org → delegate, so
      the subject is the ORGANIZATION.

      Storing it as the session was a silent identity swap, and it produced exactly the symptoms
      it should: `related-orgs` looked up links filed under the person while we asked as the org
      and got none, and `channels.*` refused because the org's stewardship wire names the PERSON
      as its delegate — so the caller was neither member nor steward of itself.

      So this branch adopts the ORGANIZATION and leaves the session alone.
    */
    if (result.subjectKind === 'organization') {
      // No person session to attach it to. Refusing beats inventing one from a token that cannot
      // say who the person is.
      if (!existing) {
        return c.json(
          {
            error: 'sign in with your Home before connecting a community',
            code: 'session_required',
          },
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
          orgStored: cookie ? 'stored' : 'too-large',
          stewardship: !!ceremony.stewardship,
        },
        { headers },
      );
    }

    // ── site-login: the subject IS the person, so this establishes the session. ──
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
    // A different person signed in ⇒ the previous org receipt is not theirs.
    if (existing && existing.person !== session.person) headers.append('set-cookie', jar.clearOrg());

    return c.json(
      {
        person: session.person,
        agentName: session.agentName,
        org: null,
        orgStored: 'none',
        stewardship: false,
      },
      { headers },
    );
  } catch (e) {
    return toResponse(e, cfg, handoffOf(c));
  }
});

/**
 * Identities this Home offers for a keyless sign-in, or `[]`.
 *
 * Whether this app shows the affordance at all is the HOME's decision, not a flag here: a Home
 * that offers none returns an empty list and the pane never renders. That is why this route
 * forwards the question instead of answering it from config.
 */
app.get('/api/connect/demo', async (c) => {
  const cfg = c.get('cfg');
  const identities = await cfg.connect.listDemoIdentities();
  return c.json({
    identities: identities.map((i) => ({
      handle: i.handle,
      name: i.name,
      sa: i.sa,
      blurb: i.blurb,
      // The organizations they custody — the reason one persona is more useful than another for
      // exercising discussion and the library.
      custodies: (i.custodies ?? []).map((o) => ({ sa: o.sa, name: o.name ?? o.sa })),
    })),
  });
});

/**
 * Sign in as one of them.
 *
 * The result is an ordinary person session — same verification, same cookie, same version. It is
 * deliberately NOT a separate "demo mode": an app with a second, weaker session path would be an
 * app whose real path is untested.
 */
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
      // Kept so the Home links this app offers actually sign the person in there. A quick connect
      // happens server-side, so without it the browser has no Home session and every one of those
      // links is a credential challenge for an account whose key they do not hold.
      ...(result.homeSession ? { homeSession: result.homeSession } : {}),
      exp: result.claims.exp,
    };
    forgetOrgs(session.person);
    const ttl = Math.max(60, result.claims.exp - Math.floor(Date.now() / 1000));
    const jar = cookieHeaders(c.req.url);
    const headers = new Headers();
    headers.append('set-cookie', jar.setSession(await seal(session, cfg.sessionSecret), ttl));
    // Whoever was here before, their org receipt is not this person's.
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

// ── Organizations ─────────────────────────────────────────────────────────────────────────────
app.get('/api/orgs', async (c) => {
  const cfg = c.get('cfg');
  try {
    const session = required(c.get('session'));
    // `?fresh=1` right after a ceremony: skip the cache rather than show somebody who just
    // connected a community a list that predates it.
    const orgs = await resolveOrgs(cfg, c, session, c.req.query('fresh') === '1');
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
    return toResponse(e, cfg, handoffOf(c));
  }
});

// ── Discussion ────────────────────────────────────────────────────────────────────────────────
app.get('/api/topics', async (c) => {
  const cfg = c.get('cfg');
  const orgForCeremony = c.req.query('org') ?? '';
  try {
    const session = required(c.get('session'));
    const org = orgForCeremony;
    const listing = await cfg.interactions.listTopics(org, await orgAuth(cfg, c, session, org));
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
    return toResponse(e, cfg, { org: orgForCeremony, ...handoffOf(c) });
  }
});

app.post('/api/topics', async (c) => {
  const cfg = c.get('cfg');
  let orgForCeremony = '';
  try {
    const session = required(c.get('session'));
    const body = (await c.req.json().catch(() => ({}))) as {
      org?: string;
      title?: string;
      participationPolicy?: 'open' | 'restricted';
    };
    const org = body.org ?? '';
    orgForCeremony = org;
    const title = String(body.title ?? '').trim();
    if (!title) return c.json({ error: 'title is required' }, 400);
    const r = await cfg.interactions.createTopic(
      org,
      { title, participationPolicy: body.participationPolicy ?? 'open' },
      await orgAuth(cfg, c, session, org),
    );
    return c.json(r);
  } catch (e) {
    return toResponse(e, cfg, { org: orgForCeremony, ...handoffOf(c) });
  }
});

app.get('/api/topics/:id', async (c) => {
  const cfg = c.get('cfg');
  const orgForCeremony = c.req.query('org') ?? '';
  try {
    const session = required(c.get('session'));
    const org = orgForCeremony;
    const topic = await cfg.interactions.readTopic(org, c.req.param('id'), await orgAuth(cfg, c, session, org));
    if (!topic) return c.json({ error: 'no such topic' }, 404);
    return c.json({ topic });
  } catch (e) {
    return toResponse(e, cfg, { org: orgForCeremony, ...handoffOf(c) });
  }
});

app.post('/api/topics/:id/posts', async (c) => {
  const cfg = c.get('cfg');
  let orgForCeremony = '';
  try {
    const session = required(c.get('session'));
    const body = (await c.req.json().catch(() => ({}))) as { org?: string; text?: string };
    const org = body.org ?? '';
    orgForCeremony = org;
    const text = String(body.text ?? '').trim();
    if (!text) return c.json({ error: 'text is required' }, 400);
    const r = await cfg.interactions.postToTopic(
      org,
      { topicId: c.req.param('id'), text },
      await orgAuth(cfg, c, session, org),
    );
    return c.json(r);
  } catch (e) {
    return toResponse(e, cfg, { org: orgForCeremony, ...handoffOf(c) });
  }
});

/**
 * Where an invitation to the selected organization gets issued.
 *
 * NOT an attempt that fails — a selection made up front, which is the only honest shape here.
 *
 * An invitation must carry a member-access grant the ORGANIZATION signed against the invitee's
 * (counterfactual) address. Without it the invitee accepts, lands in the org, and is refused with
 * "this organization has not authorized you to join" — an invitation that looked issued at every
 * step and admitted nobody, failing at the far end to the person who did nothing wrong.
 *
 * Producing that signature takes the organization's custody, reached through the steward's own
 * credential. That is a Home session. This app authenticates AS the person and holds no custody —
 * so it cannot mint one, and an app that tried and fell back would just be discovering that later
 * and more confusingly (ADR-0013).
 *
 * So this route resolves WHO may invite and WHERE, and the person completes it at their Home. Same
 * shape as every other ceremony here: enabling storage, approving messaging, granting an app a
 * read scope. None of them happen on this origin, and that is the property worth keeping.
 */
app.get('/api/invite', async (c) => {
  const cfg = c.get('cfg');
  const orgForCeremony = c.req.query('org') ?? '';
  try {
    const session = required(c.get('session'));
    const org = orgForCeremony.toLowerCase();
    if (!/^0x[0-9a-fA-F]{40}$/.test(org)) return c.json({ error: 'org is required' }, 400);

    const known = findOrg(await resolveOrgs(cfg, c, session), org);
    if (!known) {
      return c.json({ error: 'this organization is not connected to this app', code: 'not_authorized' }, 403);
    }

    return c.json({
      // Stewardship is what the Home will require. Reported so the UI can say so before sending
      // somebody to a page that will refuse them.
      canInvite: !!known.stewardshipDelegation,
      orgName: known.orgName,
      ceremonyUrl: homeCeremonyUrls(cfg.homeOrigin, {
        ...(session.homeSession ? { homeSession: session.homeSession } : {}),
      }).inviteToOrg(org),
    });
  } catch (e) {
    return toResponse(e, cfg, { org: orgForCeremony, ...handoffOf(c) });
  }
});

app.get('/api/members', async (c) => {
  const cfg = c.get('cfg');
  const orgForCeremony = c.req.query('org') ?? '';
  try {
    const session = required(c.get('session'));
    const org = orgForCeremony;
    const members = await cfg.interactions.listMembers(org, await orgAuth(cfg, c, session, org));
    return c.json({ members });
  } catch (e) {
    return toResponse(e, cfg, { org: orgForCeremony, ...handoffOf(c) });
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
      approveUrl: homeCeremonyUrls(cfg.homeOrigin, {
        ...(session.homeSession ? { homeSession: session.homeSession } : {}),
      }).approveMessaging,
    });
  } catch (e) {
    return toResponse(e, cfg, handoffOf(c));
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
    return toResponse(e, cfg, handoffOf(c));
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
          ceremonyUrl: homeCeremonyUrls(cfg.homeOrigin, {
            ...(session.homeSession ? { homeSession: session.homeSession } : {}),
          }).connectedApps,
        },
        { status: 409 },
      );
    }
    return Response.json(body, { status: r.status });
  } catch (e) {
    return toResponse(e, cfg, handoffOf(c));
  }
});

// ── Library ───────────────────────────────────────────────────────────────────────────────────
app.get('/api/library', async (c) => {
  const cfg = c.get('cfg');
  const orgForCeremony = c.req.query('org') ?? '';
  try {
    const session = required(c.get('session'));
    const org = orgForCeremony;
    const catalog = await cfg.interactions.listLibrary(org, await orgAuth(cfg, c, session, org));
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
    return toResponse(e, cfg, { org: orgForCeremony, ...handoffOf(c) });
  }
});

app.get('/api/library/:id', async (c) => {
  const cfg = c.get('cfg');
  const orgForCeremony = c.req.query('org') ?? '';
  try {
    const session = required(c.get('session'));
    const org = orgForCeremony;
    const record = await cfg.interactions.readArtifact(org, c.req.param('id'), await orgAuth(cfg, c, session, org));
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
    return toResponse(e, cfg, { org: orgForCeremony, ...handoffOf(c) });
  }
});

app.post('/api/library', async (c) => {
  const cfg = c.get('cfg');
  let orgForCeremony = '';
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
    orgForCeremony = org;
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
      await orgAuth(cfg, c, session, org),
    );
    return c.json({ artifactId: id });
  } catch (e) {
    return toResponse(e, cfg, { org: orgForCeremony, ...handoffOf(c) });
  }
});

app.delete('/api/library/:id', async (c) => {
  const cfg = c.get('cfg');
  const orgForCeremony = c.req.query('org') ?? '';
  try {
    const session = required(c.get('session'));
    const org = orgForCeremony;
    await cfg.interactions.deleteArtifact(org, c.req.param('id'), await orgAuth(cfg, c, session, org));
    return c.json({ ok: true });
  } catch (e) {
    return toResponse(e, cfg, { org: orgForCeremony, ...handoffOf(c) });
  }
});

/**
 * What this app can actually see about you, unfiltered.
 *
 * Session-gated, and it exists because "no community connected" has several very different
 * causes that look identical in the UI: the ceremony never wrote a link, the link was written
 * under a different app's id, the projection has not caught up, or this app cached an empty
 * answer. Guessing between those from the outside is exactly the debugging tax this endpoint
 * removes.
 *
 * It reads the Home TWICE on purpose — scoped to this app, and unscoped — because the difference
 * between them IS the answer. `related-orgs?client_id=` only returns links whose `requestedBy`
 * matches, so an org present in the unscoped list and absent from the scoped one means the link
 * exists but belongs to a different app. Nothing here is cached.
 */
app.get('/api/diagnostics', async (c) => {
  const cfg = c.get('cfg');
  try {
    const session = required(c.get('session'));

    const read = async (url: string) => {
      const r = await fetch(url, { headers: { authorization: `Bearer ${session.idToken}` } });
      const text = await r.text();
      let body: unknown = null;
      try {
        body = JSON.parse(text);
      } catch {
        body = text.slice(0, 400);
      }
      return { status: r.status, body };
    };

    const scopedUrl = new URL('/connect/related-orgs', session.authOrigin);
    scopedUrl.searchParams.set('client_id', cfg.clientId);
    const scoped = await read(scopedUrl.toString());
    // The person's OWN view. This app is not entitled to act on what it returns — it is here
    // purely so the two lists can be compared.
    const unscoped = await read(new URL('/connect/related-orgs', session.authOrigin).toString());

    const summarize = (r: { status: number; body: unknown }) => {
      const orgs = (r.body as { orgs?: Record<string, unknown>[] } | null)?.orgs;
      if (!Array.isArray(orgs)) return { status: r.status, orgs: null, raw: r.body };
      return {
        status: r.status,
        count: orgs.length,
        orgs: orgs.map((o) => ({
          orgAgent: o.orgAgent,
          orgName: o.orgName,
          requestedBy: o.requestedBy,
          hasStewardship: !!o.stewardshipDelegation,
          hasMembership: !!o.membershipDelegation,
          relationship: o.relationship ?? null,
        })),
      };
    };

    const ceremony = await readCeremonyOrg(c.req.raw, cfg.sessionSecret);

    return c.json({
      you: {
        // This MUST be the person, never an organization. If it matches `ceremonyOrg.address`,
        // an org-create token was stored as the session — the exact defect v2 of the cookie
        // exists to end. Reverse-resolve it on Basescan if it looks wrong.
        person: session.person,
        agentName: session.agentName,
        sessionVersion: SESSION_VERSION,
        // WHICH Home issued this token — a named person signs in at their own subdomain, so
        // this is often not the origin the app sent them to, and every read above uses it.
        authOrigin: session.authOrigin,
        tokenExpiresAt: new Date(session.exp * 1000).toISOString(),
      },
      thisApp: { clientId: cfg.clientId, redirectUri: cfg.redirectUri, a2aBase: cfg.a2aBase },
      // The receipt from the last org-create, if we still hold it.
      ceremonyOrg: ceremony
        ? {
            address: ceremony.address,
            name: ceremony.name,
            hasStewardship: !!ceremony.stewardship,
            // A true here is the identity swap, stated rather than left to be spotted.
            sameAsPerson: ceremony.address.toLowerCase() === session.person.toLowerCase(),
          }
        : null,
      relatedOrgs: { scopedToThisApp: summarize(scoped), personsOwnView: summarize(unscoped) },
    });
  } catch (e) {
    return toResponse(e, cfg, handoffOf(c));
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
