/**
 * Typed refusals.
 *
 * Read these as ANSWERS. Several of them describe a ceremony that has not happened yet — a
 * person or a steward has to do something at their Home, once, with their own credential. Your
 * app cannot do it for them and should not pretend it can: show what is missing and where.
 */
export type InteractionsErrorCode =
  /** Not a `0x…40` Smart Agent address. A name is not an address (principles.md #1). */
  | 'bad_principal'
  /** Network, timeout, or a non-JSON answer. */
  | 'unreachable'
  /** The id_token did not verify — usually expired. Re-connect. */
  | 'session_invalid'
  /**
   * This principal has never enabled interactions storage, or the grant is stale after a scope
   * widening. A STEWARD enables it once at their Home. There is no app-side workaround, and
   * that is deliberate: the grant is a delegation the owner signs.
   */
  | 'storage_not_enabled'
  /** The person has not approved their agent to message this recipient. They approve at their Home. */
  | 'messaging_not_approved'
  /** Reached an op that belongs to the owner alone. An app authenticates AS a person; it is not them. */
  | 'owner_only'
  /** This app has no read grant, its grant does not cover the record, or it was revoked on-chain. */
  | 'read_grant'
  /** The gate said no — not a member, not a steward, not a participant. */
  | 'not_authorized'
  | 'not_found'
  | 'conflict'
  | 'server_error'
  | 'refused';

export class InteractionsError extends Error {
  constructor(
    readonly code: InteractionsErrorCode,
    message: string,
    /** The server's own body, kept whole. Useful fields differ per refusal. */
    readonly body?: unknown,
    /** The server's `code` field verbatim, when it sent one. */
    readonly serverCode?: string,
  ) {
    super(message);
    this.name = 'InteractionsError';
  }
}

/** True for refusals a PERSON can resolve, at their Home, with one signature. */
export function isCeremonyRequired(e: unknown): e is InteractionsError {
  return (
    e instanceof InteractionsError &&
    (e.code === 'storage_not_enabled' || e.code === 'messaging_not_approved' || e.code === 'read_grant')
  );
}
