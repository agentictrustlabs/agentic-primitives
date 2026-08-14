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
