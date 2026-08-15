/**
 * Typed failures.
 *
 * Every one of these is an ANSWER, not a prompt to try something else. There is no fallback
 * chain here: if the Home refuses, your app reports the refusal (ADR-0013 / principles.md #6).
 * The common ones a third-party developer will hit are `redirect_not_registered` and
 * `issuer_not_allowed` — both mean a registration step at the Home is missing, not a bug.
 */
export type HomeConnectErrorCode =
  /** The Home does not recognise `client_id`, or `redirect_uri` is not an exact match for a
   *  registered one. Register the app at the Home — see docs/register-your-app.md. */
  | 'redirect_not_registered'
  /** The issuer that answered is not one this app trusts. Never widen the allowlist to make a
   *  login work; a wrong issuer is an attack, not a config nit. */
  | 'issuer_not_allowed'
  /** `state` did not match the value this app started with — a cross-site request, or a stale tab. */
  | 'state_mismatch'
  /** The id_token failed signature / alg / iss / aud / nonce / exp verification. */
  | 'token_invalid'
  /** The Home's /token endpoint refused the code (expired, replayed, PKCE mismatch). */
  | 'code_exchange_failed'
  /** The Home was unreachable or answered with something that is not JSON. */
  | 'home_unreachable'
  /** The token verified but carries no Smart Agent address in `sub`. */
  | 'no_agent_in_token';

export class HomeConnectError extends Error {
  constructor(
    readonly code: HomeConnectErrorCode,
    message: string,
    readonly detail?: unknown,
  ) {
    super(message);
    this.name = 'HomeConnectError';
  }
}
