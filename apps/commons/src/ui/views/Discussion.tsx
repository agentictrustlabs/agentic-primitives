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
 *
 * Authors are known by an org-local name, not their canonical person address. The address is
 * the identity; the name is a facet they choose for this community.
 */
export function Discussion({ org }: { org: OrgSummary | null }) {
  const [topics, setTopics] = useState<TopicSummary[]>([]);
  const [openId, setOpenId] = useState<string>('');
  const [posts, setPosts] = useState<PostView[]>([]);
  const [title, setTitle] = useState('');
  const [draft, setDraft] = useState('');
  const [you, setYou] = useState('');
  const [nameDraft, setNameDraft] = useState('');
  const [error, setError] = useState<CommonsError | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const orgAddress = org?.address ?? '';

  const loadTopics = useCallback(async () => {
    if (!orgAddress) return;
    setError(null);
    try {
      const r = await api.get<{ topics: TopicSummary[]; you?: string }>(`/api/topics?org=${orgAddress}`);
      setTopics(r.topics);
      if (typeof r.you === 'string') {
        setYou(r.you);
        if (r.you) setNameDraft(r.you);
      }
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
    setYou('');
    setNameDraft('');
    void loadTopics();
  }, [loadTopics]);

  if (!org) return <Empty>Connect a community to start a discussion.</Empty>;

  const saveName = async () => {
    const next = nameDraft.trim();
    if (!next) return;
    setBusy(true);
    try {
      const r = await api.post<{ you: string }>('/api/local-name', { org: orgAddress, displayName: next });
      setYou(r.you);
      setNameDraft(r.you);
      setError(null);
    } catch (e) {
      if (e instanceof CommonsError) setError(e);
    } finally {
      setBusy(false);
    }
  };

  const create = async () => {
    if (!title.trim() || !you) return;
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
    if (!draft.trim() || !openId || !you) return;
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

  const needsName = loaded && !you && error?.code !== 'not_authorized';

  return (
    <>
      {error?.code === 'not_authorized' ? (
        <NotAuthorizedNotice orgName={org.name} steward={org.steward} member={org.member} />
      ) : (
        error && <ErrorLine error={error} onDismiss={() => setError(null)} />
      )}

      <div className="panel">
        <h2>How you are known in {org.name}</h2>
        <p className="muted">
          A name for this community only — not your public handle, and not your agent address.
        </p>
        <div className="row" style={{ marginTop: 10 }}>
          <input
            type="text"
            placeholder="Name this community will use for you"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void saveName();
            }}
            style={{ maxWidth: 360 }}
          />
          <button className="primary" onClick={() => void saveName()} disabled={busy || !nameDraft.trim()}>
            {you ? 'Update' : 'Use this name'}
          </button>
        </div>
        {you && (
          <p className="meta" style={{ marginTop: 8 }}>
            posting as <strong>{you}</strong>
          </p>
        )}
      </div>

      <div className="panel">
        <h2>Topics in {org.name}</h2>
        {needsName && <Empty>Choose a name above before opening or posting to a topic.</Empty>}
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
            disabled={!you}
          />
          <button className="primary" onClick={create} disabled={busy || !title.trim() || !you}>
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
              <p className="meta">opened by {asCommunityName(t.createdBy)}</p>
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
                <strong>{asCommunityName(p.authorName) || 'member'}</strong>
                {p.actor && <span className="badge">agent</span>}
                <span className="meta">{p.createdAt ? new Date(p.createdAt).toLocaleString() : ''}</span>
              </div>
              <p className="post-body">{p.text || <em className="muted">(body not returned)</em>}</p>
            </div>
          ))}
          <div className="stack" style={{ marginTop: 12 }}>
            <textarea
              placeholder={you ? 'Say something…' : 'Choose a name above first'}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={!you}
            />
            <div className="row">
              <button className="primary" onClick={post} disabled={busy || !draft.trim() || !you}>
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

/** The address is identity. If a stored author is still an address, do not present it as a name. */
function asCommunityName(raw: string): string {
  const s = (raw ?? '').trim();
  if (!s) return 'unknown';
  if (/^0x[0-9a-fA-F]{40}$/.test(s) || /eip155:\d+:0x[0-9a-fA-F]{40}/i.test(s)) return 'a member';
  return s;
}
