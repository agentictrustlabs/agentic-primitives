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

/** Where a person goes to enable interactions storage for themselves or an org they steward. */
export const homeCeremonyUrls = (homeOrigin: string) => ({
  enableStorage: `${homeOrigin}/you`,
  enableMessaging: `${homeOrigin}/enable-messaging`,
  organizations: `${homeOrigin}/organizations`,
  connectedApps: `${homeOrigin}/apps`,
});
