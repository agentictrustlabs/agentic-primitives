import { createTransport, type CallerAuth, type DelegationWire, type TransportConfig } from './transport.js';
import { InteractionsError } from './errors.js';
import type {
  AnyMessageEnvelope,
  ChannelV1,
  DirectoryMember,
  LibraryArtifact,
  LibraryCatalog,
  MessagingWireStatus,
  SendResult,
  StorageStatus,
  Topic,
  TopicListing,
  TopicMessage,
} from './types.js';

export interface InteractionsClientConfig extends TransportConfig {}

export interface InteractionsClient {
  /**
   * Public read: has this principal enabled interactions storage?
   *
   * ASK THIS FIRST, every time, before rendering a surface that depends on it. `granted: false`
   * is the single most common first-run state and it has exactly one resolution — the owner or a
   * steward enables storage once at their Home. An app that instead retries, or hides the state,
   * turns a two-click fix into a mystery.
   */
  status(principal: string): Promise<StorageStatus>;

  // ── Discussion ────────────────────────────────────────────────────────────────────────────
  /** Topic descriptors for a community. Messages are NOT included — read one topic to get them. */
  listTopics(org: string, auth: CallerAuth): Promise<TopicListing>;
  /** One topic WITH its messages and their bodies. */
  readTopic(org: string, topicId: string, auth: CallerAuth): Promise<Topic | null>;
  /**
   * Open a topic. Any member may open an `open` one; only a steward may open a `restricted` one
   * (creating an invite-only space is a facilitator act, so it takes the org's own proof).
   */
  createTopic(
    org: string,
    input: { title: string; participationPolicy?: 'open' | 'restricted' },
    auth: CallerAuth,
  ): Promise<{ topicId: string }>;
  /** Post to a topic. The body is written to the ORG's vault under the envelope's own resource. */
  postToTopic(org: string, input: { topicId: string; text: string }, auth: CallerAuth): Promise<{ messageId: string }>;

  // ── Community directory ───────────────────────────────────────────────────────────────────
  /**
   * Who is in this community.
   *
   * Each entry re-verifies at the gate against the subject's own signature — presence in the
   * index is never trust, because the index itself is writable under the execution grant.
   */
  listMembers(org: string, auth: CallerAuth): Promise<DirectoryMember[]>;

  // ── 1:1 messaging ─────────────────────────────────────────────────────────────────────────
  /** The person's outbound rail: is a wire signed, and which recipients does it cover? */
  messagingStatus(person: string, auth: CallerAuth): Promise<MessagingWireStatus>;
  /**
   * Send a 1:1 message, performed by the SENDER's own agent.
   *
   * Name the recipient exactly one way — address, agent name, or an existing conversation.
   * These are alternatives the caller picks, never a chain the client walks: an app that tried
   * an address, then a name, then a conversation would eventually send to whoever answered.
   *
   * Throws `messaging_not_approved` when the person has not authorized their agent to message
   * this counterparty. That approval is one signature at their Home and cannot happen here —
   * their custody credential does not live on your origin.
   */
  sendMessage(
    person: string,
    input: {
      to: { address: string } | { agentName: string } | { conversationId: string };
      text: string;
      subject?: string;
      /** Links this message to what it is ABOUT — an artifact, a topic, an endeavor. */
      contextRefs?: { kind: string; id: string; label?: string }[];
    },
    auth: CallerAuth,
  ): Promise<SendResult>;

  // ── Organization content library ──────────────────────────────────────────────────────────
  /** The org-wide artifact index, read from the org's vault. Steward-gated. */
  listLibrary(org: string, auth: CallerAuth): Promise<LibraryCatalog>;
  /** One artifact record, bytes included when `source === 'blob'`. */
  readArtifact(org: string, artifactId: string, auth: CallerAuth): Promise<Record<string, unknown> | null>;
  /**
   * Write an artifact AND update the index.
   *
   * Two records, in this order: the artifact first, the catalog second. If the catalog were
   * written first and the artifact write then failed, the library would list something that does
   * not exist — a dangling entry a reader cannot open and an owner cannot explain.
   */
  putArtifact(
    org: string,
    input: { artifact: LibraryArtifact; bytes?: Uint8Array },
    auth: CallerAuth,
  ): Promise<{ artifactId: string }>;
  /** Remove an artifact and drop it from the index. */
  deleteArtifact(org: string, artifactId: string, auth: CallerAuth): Promise<void>;

  /** Escape hatch: any op in docs/interactions-api.md, unwrapped. */
  call(principal: string, op: string, payload: Record<string, unknown>): Promise<Record<string, unknown>>;
}

const CATALOG_RESOURCE = 'content.catalog';
const artifactResource = (id: string): string => `content.artifact.${id}`;

/** Merge the caller's credentials into an op payload. `stewardship` rides only when present. */
function withAuth(auth: CallerAuth, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    session: auth.session,
    ...(auth.stewardship ? { stewardship: auth.stewardship } : {}),
    ...extra,
  };
}

/** Envelopes carry a body HASH; the text arrives separately, keyed by message id. */
function toTopicMessage(entry: unknown, bodies: Record<string, unknown>): TopicMessage | null {
  const e = entry as { envelope?: AnyMessageEnvelope; authorName?: string; actor?: string };
  const env = e?.envelope as (AnyMessageEnvelope & { createdAt?: string; from?: string }) | undefined;
  const id = String(env?.id ?? '');
  if (!id) return null;
  const raw = bodies[id];
  const text =
    typeof raw === 'string'
      ? raw
      : String((raw as { text?: string; bodyText?: string } | undefined)?.text ?? (raw as { bodyText?: string } | undefined)?.bodyText ?? '');
  return {
    id,
    authorName: String(e?.authorName ?? ''),
    from: String(env?.from ?? ''),
    createdAt: String(env?.createdAt ?? ''),
    text: text.trim(),
    ...(e?.actor ? { actor: String(e.actor) } : {}),
  };
}

function toTopic(channel: ChannelV1 & { participationPolicy?: 'open' | 'restricted' }, bodies: Record<string, unknown>): Topic {
  return {
    id: String(channel.descriptor?.id ?? ''),
    title: String(channel.title ?? ''),
    createdBy: String(channel.createdBy ?? ''),
    // The server resolves this from the legacy `visibility` field when a topic predates the
    // policy naming, so trust what it sent and default to the permissive-to-members `open`.
    participationPolicy: channel.participationPolicy ?? 'open',
    messages: (channel.messages ?? []).map((m) => toTopicMessage(m, bodies)).filter((m): m is TopicMessage => m !== null),
  };
}

export function createInteractionsClient(config: InteractionsClientConfig): InteractionsClient {
  const t = createTransport(config);

  // Hoisted rather than reached through `this`: `putArtifact` and `deleteArtifact` both need the
  // catalog, and a method that calls a sibling through `this` breaks the moment a caller
  // destructures the client — which is the normal way to use one.
  const readCatalog = async (org: string, auth: CallerAuth): Promise<LibraryCatalog> => {
    const body = await t.call(org, 'content.get', withAuth(auth, { resource: CATALOG_RESOURCE }));
    return Array.isArray(body.record) ? (body.record as LibraryCatalog) : [];
  };

  return {
    async status(principal) {
      // A public read, so it takes `raw` — a 404/500 here means the WORKER is unhealthy, which is
      // a different problem from "this principal has not enabled storage" and should read that way.
      const { status, body } = await t.raw(principal, 'status', {});
      if (status !== 200) {
        throw new InteractionsError('unreachable', `status returned HTTP ${status}`, body);
      }
      return {
        granted: body.granted === true,
        current: body.current === true,
        deliveryGranted: body.deliveryGranted === true,
      };
    },

    async listTopics(org, auth) {
      const body = await t.call(org, 'channels.list', withAuth(auth));
      const channels = (Array.isArray(body.channels) ? body.channels : []) as ChannelV1[];
      return {
        topics: channels.map((c) => toTopic(c, {})),
        you: String(body.you ?? ''),
        steward: body.steward === true,
      };
    },

    async readTopic(org, topicId, auth) {
      const body = await t.call(org, 'channels.read', withAuth(auth, { channelId: topicId }));
      const channels = (Array.isArray(body.channels) ? body.channels : []) as ChannelV1[];
      const bodies = (body.bodies ?? {}) as Record<string, unknown>;
      const hit = channels.find((c) => String(c.descriptor?.id ?? '') === topicId);
      return hit ? toTopic(hit, bodies) : null;
    },

    async createTopic(org, input, auth) {
      const body = await t.call(
        org,
        'channels.create',
        withAuth(auth, {
          title: input.title,
          participationPolicy: input.participationPolicy ?? 'open',
        }),
      );
      return { topicId: String(body.channelId ?? '') };
    },

    async postToTopic(org, input, auth) {
      const body = await t.call(org, 'channels.post', withAuth(auth, { channelId: input.topicId, bodyText: input.text }));
      return { messageId: String(body.messageId ?? '') };
    },

    async listMembers(org, auth) {
      const body = await t.call(org, 'directory.list', withAuth(auth));
      // Rows are `{ listing, … }` index entries — the server already dropped expired ones, and
      // the gate re-verifies each listing's own signature. Unwrap to the listing itself.
      const rows = (Array.isArray(body.listings) ? body.listings : []) as { listing?: DirectoryMember }[];
      return rows.map((r) => r.listing).filter((l): l is DirectoryMember => !!l);
    },

    async messagingStatus(person, auth) {
      const body = await t.call(person, 'messaging.wireStatus', withAuth(auth));
      return {
        sessionKey: String(body.sessionKey ?? ''),
        wirePresent: body.wirePresent === true,
        enabledAt: (body.enabledAt as string | null) ?? null,
        recipients: (Array.isArray(body.recipients) ? body.recipients : []).map(String),
        ...(typeof body.wireDamaged === 'string' ? { wireDamaged: body.wireDamaged } : {}),
      };
    },

    async sendMessage(person, input, auth) {
      const to =
        'address' in input.to
          ? { recipient: input.to.address.toLowerCase() }
          : 'agentName' in input.to
            ? { recipientName: input.to.agentName }
            : { conversationId: input.to.conversationId };
      const body = await t.call(
        person,
        'messaging.send',
        withAuth(auth, {
          ...to,
          bodyText: input.text,
          ...(input.subject ? { subject: input.subject } : {}),
          ...(input.contextRefs?.length ? { contextRefs: input.contextRefs } : {}),
        }),
      );
      return {
        messageId: String(body.messageId ?? ''),
        conversationId: String(body.conversationId ?? ''),
      };
    },

    listLibrary: readCatalog,

    async readArtifact(org, artifactId, auth) {
      const body = await t.call(org, 'content.get', withAuth(auth, { resource: artifactResource(artifactId) }));
      return (body.record ?? null) as Record<string, unknown> | null;
    },

    async putArtifact(org, input, auth) {
      const id = input.artifact.id;
      if (!id) throw new InteractionsError('refused', 'artifact.id is required');

      // 1. the bytes + metadata …
      await t.call(
        org,
        'content.put',
        withAuth(auth, {
          resource: artifactResource(id),
          data: {
            ...input.artifact,
            ...(input.bytes ? { bytesB64: bytesToB64(input.bytes), size: input.bytes.byteLength } : {}),
            updatedAt: new Date().toISOString(),
          },
        }),
      );

      // 2. … then the index. A read-modify-write, so a concurrent writer can lose an entry here;
      // the server merges for SCOPED callers but replaces for stewards, because a steward's
      // delete has to work. Single-writer-per-org in practice; noted rather than hidden.
      const catalog = await readCatalog(org, auth);
      const next = [...catalog.filter((a) => a.id !== id), { ...input.artifact, updatedAt: new Date().toISOString() }];
      await t.call(org, 'content.put', withAuth(auth, { resource: CATALOG_RESOURCE, data: next }));
      return { artifactId: id };
    },

    async deleteArtifact(org, artifactId, auth) {
      // `data: null` IS the delete on this rail — the server reads it as a delete and checks the
      // caller for `delete`, so a grant that says `write` cannot erase records.
      await t.call(org, 'content.put', withAuth(auth, { resource: artifactResource(artifactId), data: null }));
      const catalog = await readCatalog(org, auth);
      await t.call(
        org,
        'content.put',
        withAuth(auth, { resource: CATALOG_RESOURCE, data: catalog.filter((a) => a.id !== artifactId) }),
      );
    },

    call: (principal, op, payload) => t.call(principal, op, payload),
  };
}

/** base64 without Node's Buffer — this has to run in a Worker. */
function bytesToB64(bytes: Uint8Array): string {
  let s = '';
  // Chunked: `String.fromCharCode(...huge)` blows the argument limit on a real file.
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    s += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(s);
}

export type { CallerAuth, DelegationWire };
