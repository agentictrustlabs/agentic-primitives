import { useCallback, useEffect, useState } from 'react';
import type { OrgSummary, PostView, TopicSummary } from '../../shared/api-types.js';
import { api, CommonsError } from '../api.js';
import { Empty, ErrorLine, NotAuthorizedNotice } from './parts.js';

/**
 * Discussion — topics and posts belonging to a community.
 *
 * Every topic descriptor and every post lands in the ORGANIZATION's vault, written through a
 * single serialized execution point for that org so concurrent posts cannot interleave into a
 * corrupt document. This app keeps no copy: refresh and you are reading the org's own record.
 *
 * A post's TEXT never travels inside its envelope. The envelope carries a hash and a vault
 * pointer; the bodies arrive alongside, keyed by message id. That is why a post can render with
 * no text — the envelope is there and the body was not returned — and why we show it as empty
 * rather than substituting something plausible.
 */
export function Discussion({ org }: { org: OrgSummary | null }) {
  const [topics, setTopics] = useState<TopicSummary[]>([]);
  const [openId, setOpenId] = useState<string>('');
  const [posts, setPosts] = useState<PostView[]>([]);
  const [title, setTitle] = useState('');
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<CommonsError | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const orgAddress = org?.address ?? '';

  const loadTopics = useCallback(async () => {
    if (!orgAddress) return;
    setError(null);
    try {
      const r = await api.get<{ topics: TopicSummary[] }>(`/api/topics?org=${orgAddress}`);
      setTopics(r.topics);
    } catch (e) {
      if (e instanceof CommonsError) setError(e);
    } finally {
      setLoaded(true);
    }
  }, [orgAddress]);

  const openTopic = useCallback(
    async (id: string) => {
      setOpenId(id);
      setPosts([]);
      try {
        const r = await api.get<{ topic: { messages: PostView[] } }>(`/api/topics/${id}?org=${orgAddress}`);
        setPosts(r.topic.messages);
      } catch (e) {
        if (e instanceof CommonsError) setError(e);
      }
    },
    [orgAddress],
  );

  useEffect(() => {
    setOpenId('');
    setPosts([]);
    setLoaded(false);
    void loadTopics();
  }, [loadTopics]);

  if (!org) return <Empty>Connect a community to start a discussion.</Empty>;

  const create = async () => {
    if (!title.trim()) return;
    setBusy(true);
    try {
      const r = await api.post<{ topicId: string }>('/api/topics', { org: orgAddress, title: title.trim() });
      setTitle('');
      await loadTopics();
      await openTopic(r.topicId);
    } catch (e) {
      if (e instanceof CommonsError) setError(e);
    } finally {
      setBusy(false);
    }
  };

  const post = async () => {
    if (!draft.trim() || !openId) return;
    setBusy(true);
    try {
      await api.post(`/api/topics/${openId}/posts`, { org: orgAddress, text: draft.trim() });
      setDraft('');
      await openTopic(openId);
    } catch (e) {
      if (e instanceof CommonsError) setError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {error?.code === 'not_authorized' ? (
        <NotAuthorizedNotice orgName={org.name} steward={org.steward} />
      ) : (
        error && <ErrorLine error={error} onDismiss={() => setError(null)} />
      )}

      <div className="panel">
        <h2>Topics in {org.name}</h2>
        <div className="row" style={{ marginTop: 10 }}>
          <input
            type="text"
            placeholder="Open a topic…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void create();
            }}
            style={{ maxWidth: 360 }}
          />
          <button className="primary" onClick={create} disabled={busy || !title.trim()}>
            Open
          </button>
        </div>

        <div style={{ marginTop: 14 }}>
          {topics.length === 0 && loaded && <Empty>No topics yet. Open the first one.</Empty>}
          {topics.map((t) => (
            <div key={t.id} className="item">
              <div className="row">
                <button className="link" onClick={() => void openTopic(t.id)}>
                  {t.title || '(untitled)'}
                </button>
                {t.participationPolicy === 'restricted' && <span className="badge">invite only</span>}
                {openId === t.id && <span className="badge">open</span>}
              </div>
              <p className="meta">opened by {t.createdBy || 'unknown'}</p>
            </div>
          ))}
        </div>
      </div>

      {openId && (
        <div className="panel">
          <h3>{topics.find((t) => t.id === openId)?.title ?? 'Topic'}</h3>
          {posts.length === 0 && <Empty>Nothing posted yet.</Empty>}
          {posts.map((p) => (
            <div key={p.id} className="item">
              <div className="row">
                <strong>{p.authorName || 'member'}</strong>
                {p.actor && <span className="badge">agent</span>}
                <span className="meta">{p.createdAt ? new Date(p.createdAt).toLocaleString() : ''}</span>
              </div>
              <p className="post-body">{p.text || <em className="muted">(body not returned)</em>}</p>
            </div>
          ))}
          <div className="stack" style={{ marginTop: 12 }}>
            <textarea placeholder="Say something…" value={draft} onChange={(e) => setDraft(e.target.value)} />
            <div className="row">
              <button className="primary" onClick={post} disabled={busy || !draft.trim()}>
                Post
              </button>
              <span className="muted">written to {org.name}&apos;s vault, not to this app</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
