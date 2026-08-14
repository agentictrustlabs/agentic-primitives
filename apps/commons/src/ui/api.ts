// The SPA's only way to reach anything.
//
// Note what is NOT here: no id_token, no delegation, no chain client, no A2A base URL. The
// browser holds no credential at all — the session is an httpOnly cookie it cannot read, and
// every privileged call is made by this app's own Worker. That is the shape to copy.

import type { ApiError } from '../shared/api-types.js';

export class CommonsError extends Error {
  constructor(
    message: string,
    readonly code?: string,
    /** Set when the person can fix this at their Home, with one signature. */
    readonly ceremonyUrl?: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'CommonsError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  const body = (await res.json().catch(() => ({}))) as T & ApiError;
  if (!res.ok) {
    throw new CommonsError(body.error ?? `request failed (${res.status})`, body.code, body.ceremonyUrl, res.status);
  }
  return body as T;
}

export const api = {
  get: <T>(path: string): Promise<T> => request<T>(path),
  post: <T>(path: string, body?: unknown): Promise<T> =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  del: <T>(path: string): Promise<T> => request<T>(path, { method: 'DELETE' }),
};
