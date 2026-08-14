import type { CommonsError } from '../api.js';

/**
 * A refusal the PERSON can resolve, shown as what it is.
 *
 * The substrate says "no storage grant" / "no messaging wire" / "no read grant" because a
 * ceremony has not happened — one signature, at their Home, with a credential that deliberately
 * does not exist on this origin. Rendering that as an error would be a lie; rendering it as a
 * link is the honest shape.
 */
export function CeremonyNotice({ url, title, body }: { url: string; title: string; body: string }) {
  return (
    <div className="notice" style={{ marginBottom: 14 }}>
      <strong>{title}</strong>
      <p style={{ margin: '4px 0 8px' }}>{body}</p>
      <a href={url} target="_blank" rel="noreferrer">
        Open your Home →
      </a>
    </div>
  );
}

/**
 * "not a member, not a steward" — the gate's answer when neither proof landed.
 *
 * It is worth its own explanation because the raw text ("publish a directory listing") describes
 * the MEMBER route and is misleading for the far more common case: this app holds no stewardship
 * delegation for that organization, so it presented nothing and the gate correctly refused. The
 * two are different problems with different fixes, and the refusal cannot tell them apart.
 */
export function NotAuthorizedNotice({ orgName, steward }: { orgName: string; steward: boolean }) {
  return (
    <div className="notice" style={{ marginBottom: 14 }}>
      <strong>This app cannot act for {orgName} yet</strong>
      {steward ? (
        <p style={{ margin: '4px 0 0' }}>
          It holds a stewardship delegation, so the refusal is about the delegation itself — the gate
          re-verifies it on-chain every call, and it will refuse one that is expired, revoked, or of the
          wrong shape. Re-connecting the community re-issues it.
        </p>
      ) : (
        <p style={{ margin: '4px 0 0' }}>
          It holds <strong>no stewardship delegation</strong> for this organization, so it presented no
          proof and the gate refused — correctly. Re-connect the community so your Home issues one, or
          join it as a member at your Home if you do not steward it.
        </p>
      )}
    </div>
  );
}

export function ErrorLine({ error, onDismiss }: { error: CommonsError; onDismiss?: () => void }) {
  if (error.ceremonyUrl) {
    return (
      <CeremonyNotice
        url={error.ceremonyUrl}
        title="One step is missing at your Home"
        body={error.message}
      />
    );
  }
  return (
    <p className="error">
      {error.message}
      {error.code ? ` (${error.code})` : ''}
      {onDismiss && (
        <>
          {' '}
          <button className="link" onClick={onDismiss}>
            dismiss
          </button>
        </>
      )}
    </p>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="muted">{children}</p>;
}
