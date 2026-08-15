// Everything this app knows about the world, in one module. Hostnames live here, never in
// packages/* (ADR-0021).

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
   * Same-account `*.workers.dev` fetches fail with error 1042 — bind instead.
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

export const homeCeremonyUrls = (
  homeOrigin: string,
  ctx: { returnTo?: string; org?: string; homeSession?: string } = {},
) => {
  const handoff = ctx.homeSession ? `#session=${encodeURIComponent(ctx.homeSession)}` : '';
  const withCtx = (path: string): string => {
    const u = new URL(path, homeOrigin);
    if (ctx.returnTo) u.searchParams.set('return', ctx.returnTo);
    if (ctx.org) u.searchParams.set('org', ctx.org);
    return u.toString() + handoff;
  };
  return {
    enableStorage: withCtx('/enable-messaging'),
    approveMessaging: `${homeOrigin}/messages${handoff}`,
    organizations: `${homeOrigin}/organizations${handoff}`,
    connectedApps: `${homeOrigin}/apps${handoff}`,
    inviteToOrg: (org: string): string => `${homeOrigin}/org/${org.toLowerCase()}/invite${handoff}`,
  };
};
