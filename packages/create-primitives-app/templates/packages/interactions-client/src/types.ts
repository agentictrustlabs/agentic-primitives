// Wire shapes, narrowed to what an app actually renders.
//
// The canonical types live in `@agenticprimitives/fabric/messaging` (`ChannelV1`,
// `MessageEnvelopeV1`, `ConversationDescriptorV1`). We re-export the envelope type rather than
// restate it — a second definition of a signed record is a second definition that can disagree
// with the signature.

import type { AnyMessageEnvelope, ChannelV1 } from '@agenticprimitives/fabric/messaging';

export type { AnyMessageEnvelope, ChannelV1 };

/** Answer to `status` — a PUBLIC read; no session needed. Ask this before anything else. */
export interface StorageStatus {
  /** Has a steward ever enabled interactions storage for this principal? */
  granted: boolean;
  /** Is the grant still current? A widened scope makes an old grant stale — re-enable at the Home. */
  current: boolean;
  /** Is inbound delivery (someone else writing to this principal's inbox) enabled? */
  deliveryGranted: boolean;
}

/** One discussion topic. `open` = every org member participates; `restricted` = invite-only. */
export interface Topic {
  id: string;
  title: string;
  createdBy: string;
  participationPolicy: 'open' | 'restricted';
  /** Populated only by `readTopic`; `listTopics` returns descriptors with no messages. */
  messages: TopicMessage[];
}

export interface TopicMessage {
  id: string;
  authorName: string;
  /** Sender's canonical agent id (CAIP-10). */
  from: string;
  createdAt: string;
  /**
   * The rendered text.
   *
   * Envelopes carry a HASH and a vault pointer, never the body — so the text arrives in a
   * separate `bodies` map and is matched by message id. An envelope whose body did not come back
   * renders as empty rather than as a guess.
   */
  text: string;
  /** Present when an agent, not a human session, authored the post. */
  actor?: string;
}

export interface TopicListing {
  topics: Topic[];
  /** How the caller is named in this community, or `Steward`. */
  you: string;
  /** Did the gate admit this caller as a steward of the principal? */
  steward: boolean;
}

/** A published directory listing — how a member appears in a community. */
export interface DirectoryMember {
  /** CAIP-10 canonical agent id of the member. */
  subject: string;
  displayName?: string;
  publishedAt?: string;
  [k: string]: unknown;
}

/** The person's outbound messaging rail. */
export interface MessagingWireStatus {
  /** The session key every wire must delegate to. Provisioned by the deployment, not by you. */
  sessionKey: string;
  /** Has the person signed a messaging wire at all? */
  wirePresent: boolean;
  enabledAt: string | null;
  /** The recipients the current wire covers. Sending outside this set is refused. */
  recipients: string[];
  /** Set when a wire exists but cannot be read — NOT the same as "no contacts approved". */
  wireDamaged?: string;
}

export interface SendResult {
  messageId: string;
  conversationId: string;
}

/**
 * One entry in an organization's content library.
 *
 * A library entry is a Content Artifact: a `.md`, a `SKILL.md`, a `.ttl`, a JSON-LD record, or
 * an image, plus the per-artifact access grants that decide who else may read it. `source`
 * names where the bytes live; only `blob` inlines them as `bytesB64`.
 */
export interface LibraryArtifact {
  id: string;
  kind: 'skill' | 'ttl' | 'md' | 'json-ld' | 'image';
  name: string;
  source: 'blob' | 'graphdb' | 'vault' | 'external';
  /** Folder path, e.g. `reports/2026`. `''` is the root. */
  folder: string;
  isFolder?: boolean;
  contentType: string;
  size?: number;
  version?: number;
  updatedAt?: string;
  /** Where non-blob bytes live. */
  pointer?: string;
  /** Per-artifact access grants. Present on the owner's own read. */
  grants?: unknown[];
}

/** The org-wide index. Authoritative in the org's vault; never in your app's database. */
export type LibraryCatalog = LibraryArtifact[];
