import type { ApiError } from '../shared/api-types.js';

export class AppError extends Error {
  constructor(
    message: string,
    readonly code?: string,
    readonly ceremonyUrl?: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'AppError';
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
    throw new AppError(body.error ?? `request failed (${res.status})`, body.code, body.ceremonyUrl, res.status);
  }
  return body as T;
}

export const api = {
  get: <T>(path: string): Promise<T> => request<T>(path),
  post: <T>(path: string, body?: unknown): Promise<T> =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
};
