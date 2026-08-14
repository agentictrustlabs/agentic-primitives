// Everything this app knows about the world, in one module (the ADR-0021 shape: hostnames and
// deployment specifics live at the app layer, never inside a reusable package).

import type { Address } from '@agenticprimitives/types';
import { createHomeConnect, type HomeConnect } from '@starter/home-connect';
import { createInteractionsClient, type InteractionsClient } from '@starter/interactions-client';

export interface Env {
  ASSETS: Fetcher;

  CLIENT_ID: string;
  REDIRECT_URI: string;
  HOME_ORIGIN: string;
  HOME_ZONE: string;
  DELEGATE: string;
  A2A_BASE: string;
  CHAIN_ID: string;

  /** Encrypts the session cookie. `wrangler secret put SESSION_SECRET`. */
  SESSION_SECRET?: string;

  /**
   * Optional Cloudflare service binding to the A2A Worker.
   *
   * On Cloudflare, a Worker cannot fetch a sibling `*.workers.dev` URL on the same account over
   * the public internet (error 1042). If you deploy alongside the rails, bind them instead:
   *
   *   [[services]]
   *   binding = "A2A"
   *   service = "demo-a2a-production"
   *
   * Cross-account deploys use the public URL and need nothing here.
   */
  A2A?: Fetcher;
}

export interface AppConfig {
  clientId: string;
  redirectUri: string;
  homeOrigin: string;
  a2aBase: string;
  chainId: number;
  connect: HomeConnect;
  interactions: InteractionsClient;
  sessionSecret: string;
}

export class ConfigError extends Error {}

export function buildConfig(env: Env): AppConfig {
  // Fail LOUDLY and once, at the top, rather than letting an unsealed cookie or an unregistered
  // client_id surface as a confusing 401 later. A missing secret is a deploy step, not a runtime
  // condition to degrade around.
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 16) {
    throw new ConfigError(
      'SESSION_SECRET is unset or too short. Local: copy .dev.vars.example to .dev.vars. ' +
        'Deployed: wrangler secret put SESSION_SECRET',
    );
  }
  if (!env.CLIENT_ID || !env.REDIRECT_URI) {
    throw new ConfigError('CLIENT_ID and REDIRECT_URI are required — see docs/register-your-app.md');
  }

  const connect = createHomeConnect({
    clientId: env.CLIENT_ID,
    redirectUri: env.REDIRECT_URI,
    delegate: env.DELEGATE as Address,
    homeOrigin: env.HOME_ORIGIN,
    homeZone: env.HOME_ZONE,
  });

  const interactions = createInteractionsClient({
    a2aBase: env.A2A_BASE,
    // A service binding when one is configured; the public URL otherwise. Selected here, once,
    // rather than tried-then-fallen-back-from at each call site.
    ...(env.A2A ? { fetch: env.A2A.fetch.bind(env.A2A) } : {}),
  });

  return {
    clientId: env.CLIENT_ID,
    redirectUri: env.REDIRECT_URI,
    homeOrigin: env.HOME_ORIGIN,
    a2aBase: env.A2A_BASE,
    chainId: Number(env.CHAIN_ID || 84532),
    connect,
    interactions,
    sessionSecret: env.SESSION_SECRET,
  };
}

/**
 * Where a person goes to complete each ceremony this app cannot perform.
 *
 * These are not interchangeable, and getting them wrong sends somebody to a page that cannot fix
 * what they are looking at — which is worse than showing no link at all.
 *
 * `enableStorage` → `/enable-messaging`, despite the name. That page force-provisions the two
 * grants the vault path needs — the interactions grant and the inbox-delivery grant — for the
 * person AND every organization they steward. It takes `?return=` (must be a registered relying
 * origin) and `?org=` to include a specific organization. It is the answer to
 * `no interactions grant`.
 *
 * `approveMessaging` → `/messages`. The outbound messaging WIRE is a different artifact, and its
 * ceremony is per-counterparty: the person approves a named recipient, once. The reference Home
 * offers that prompt INLINE beside a refused send in its own messaging UI — there is no standalone
 * route to link at, so the honest instruction is "message them once from your Home, approve there".
 * The wire then lives with the person's agent, so sending from here works afterwards.
 */
export const homeCeremonyUrls = (homeOrigin: string, ctx: { returnTo?: string; org?: string } = {}) => {
  const withCtx = (path: string): string => {
    const u = new URL(path, homeOrigin);
    if (ctx.returnTo) u.searchParams.set('return', ctx.returnTo);
    if (ctx.org) u.searchParams.set('org', ctx.org);
    return u.toString();
  };
  return {
    enableStorage: withCtx('/enable-messaging'),
    approveMessaging: `${homeOrigin}/messages`,
    organizations: `${homeOrigin}/organizations`,
    connectedApps: `${homeOrigin}/apps`,
  };
};
