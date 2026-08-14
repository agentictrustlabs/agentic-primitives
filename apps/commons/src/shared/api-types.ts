// The contract between this app's Worker and its SPA. Shared so a rename breaks the build
// rather than the page.

export interface Me {
  person: string;
  agentName: string | null;
  /** The Home that issued this session. */
  authOrigin: string;
  /** Whether this person has enabled their own interactions storage. */
  storage: { granted: boolean; current: boolean };
}

export interface OrgSummary {
  address: string;
  name: string;
  /** Do we hold a stewardship wire for this org? Without one, org surfaces are read-only-at-best. */
  steward: boolean;
  /** keccak256 of the stewardship delegation — the value an on-chain revoke would name. */
  delegationHash?: string;
  storage: { granted: boolean; current: boolean };
}

export interface TopicSummary {
  id: string;
  title: string;
  createdBy: string;
  participationPolicy: 'open' | 'restricted';
}

export interface PostView {
  id: string;
  authorName: string;
  from: string;
  createdAt: string;
  text: string;
  actor?: string;
}

export interface LibraryEntry {
  id: string;
  name: string;
  kind: string;
  folder: string;
  contentType: string;
  size?: number;
  updatedAt?: string;
  isFolder?: boolean;
  /** SHA-256 commitment over the normalized text — recomputable by any reader. */
  commitment?: string;
}

export interface MessagingState {
  wirePresent: boolean;
  recipients: string[];
  /** Where the person goes to approve messaging. Their credential lives there, not here. */
  approveUrl: string;
}

export interface ConversationView {
  conversationId: string;
  subject: string;
  with: string;
  updatedAt: string;
  preview: string;
}

/** Every failure the SPA renders. `ceremonyUrl` is set when a person can fix it at their Home. */
export interface ApiError {
  error: string;
  code?: string;
  ceremonyUrl?: string;
}
