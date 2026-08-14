import { useCallback, useEffect, useState } from 'react';
import type { LibraryEntry, OrgSummary } from '../../shared/api-types.js';
import { api, CommonsError } from '../api.js';
import { Empty, ErrorLine } from './parts.js';

interface ArtifactView {
  artifact: Record<string, unknown>;
  text: string;
  /** Recomputed from the bytes we just received. */
  commitment: string | null;
  /** What was stored when the artifact was written. */
  storedCommitment: string | null;
}

/**
 * The community library — content management, on the owner's storage.
 *
 * Each entry is a Content Artifact: a document plus the per-artifact grants that decide who else
 * may read it. Two records per artifact live in the org's vault — the artifact itself and an
 * index entry — and both are written under the stewardship delegation the organization signed.
 *
 * Every artifact carries a SHA-256 commitment over its normalized text. This app recomputes that
 * commitment on read and shows both values. Matching means the bytes are what was published;
 * differing means they are not. Neither claim depends on trusting this app, which is what makes
 * the commitment worth storing at all.
 */
export function Library({ org }: { org: OrgSummary | null }) {
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [open, setOpen] = useState<ArtifactView | null>(null);
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [error, setError] = useState<CommonsError | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const orgAddress = org?.address ?? '';

  const load = useCallback(async () => {
    if (!orgAddress) return;
    setError(null);
    try {
      const r = await api.get<{ entries: LibraryEntry[] }>(`/api/library?org=${orgAddress}`);
      setEntries(r.entries);
    } catch (e) {
      if (e instanceof CommonsError) setError(e);
    } finally {
      setLoaded(true);
    }
  }, [orgAddress]);

  useEffect(() => {
    setOpen(null);
    setLoaded(false);
    void load();
  }, [load]);

  if (!org) return <Empty>Connect a community to keep a library.</Empty>;

  const save = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await api.post('/api/library', { org: orgAddress, name: name.trim(), text });
      setName('');
      setText('');
      await load();
    } catch (e) {
      if (e instanceof CommonsError) setError(e);
    } finally {
      setBusy(false);
    }
  };

  const view = async (id: string) => {
    try {
      setOpen(await api.get<ArtifactView>(`/api/library/${id}?org=${orgAddress}`));
    } catch (e) {
      if (e instanceof CommonsError) setError(e);
    }
  };

  const remove = async (id: string) => {
    setBusy(true);
    try {
      await api.del(`/api/library/${id}?org=${orgAddress}`);
      setOpen(null);
      await load();
    } catch (e) {
      if (e instanceof CommonsError) setError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {error && <ErrorLine error={error} onDismiss={() => setError(null)} />}

      <div className="panel">
        <h2>{org.name} library</h2>
        {!org.steward && (
          <p className="muted">
            You are a member here, not a steward. Writing to an organization&apos;s library takes the
            delegation <em>it</em> signed naming you — the gate checks that on-chain, so reading may work
            while writing is refused.
          </p>
        )}
        <div style={{ marginTop: 10 }}>
          {entries.length === 0 && loaded && <Empty>Nothing published yet.</Empty>}
          {entries.map((e) => (
            <div key={e.id} className="item">
              <div className="row">
                <button className="link" onClick={() => void view(e.id)}>
                  {e.name}
                </button>
                <span className="badge">{e.kind}</span>
                {e.size !== undefined && <span className="meta">{e.size} bytes</span>}
                <button className="link" style={{ marginLeft: 'auto' }} onClick={() => void remove(e.id)} disabled={busy}>
                  remove
                </button>
              </div>
              <p className="meta">
                {e.folder ? `${e.folder}/ · ` : ''}
                {e.updatedAt ? new Date(e.updatedAt).toLocaleString() : ''}
              </p>
            </div>
          ))}
        </div>
      </div>

      {open && (
        <div className="panel">
          <h3>{String(open.artifact.name ?? 'Artifact')}</h3>
          <pre className="post-body scroll-x" style={{ margin: '8px 0' }}>
            {open.text || '(empty)'}
          </pre>
          <div className="scroll-x">
            <table className="facts">
              <tbody>
                <tr>
                  <td>stored commitment</td>
                  <td>{open.storedCommitment ?? '—'}</td>
                </tr>
                <tr>
                  <td>recomputed now</td>
                  <td>{open.commitment ?? '—'}</td>
                </tr>
                <tr>
                  <td>verdict</td>
                  <td>
                    {open.storedCommitment && open.commitment
                      ? open.storedCommitment === open.commitment
                        ? 'match — these bytes are what was published'
                        : 'MISMATCH — these bytes are not what was published'
                      : 'no stored commitment to compare against'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="panel">
        <h3>Publish a document</h3>
        <div className="stack" style={{ marginTop: 8 }}>
          <input
            type="text"
            placeholder="file name — e.g. charter.md"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <textarea placeholder="Markdown…" value={text} onChange={(e) => setText(e.target.value)} />
          <div className="row">
            <button className="primary" onClick={save} disabled={busy || !name.trim()}>
              {busy ? 'Publishing…' : 'Publish'}
            </button>
            <span className="muted">encrypted at rest in {org.name}&apos;s vault</span>
          </div>
        </div>
      </div>
    </>
  );
}
