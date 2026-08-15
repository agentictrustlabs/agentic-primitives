// @starter/interactions-client — the four things a social app needs, on somebody else's storage.
//
// Discussion topics, 1:1 messages, an organization's content library, and a person's inbox. None
// of it is stored by your app. Every record lands in the OWNER's encrypted vault, reachable only
// through a delegation the owner signed and can revoke on-chain without telling you.
//
// That inversion is the product, not a constraint to route around. It means a person can leave
// your app and keep their conversations; it means a revoked grant actually stops you; and it
// means you are never the party holding somebody else's private data.
//
// See docs/interactions-api.md for the full op reference, including the ones this client does
// not wrap (endeavors, org assistants, applications, invites).

export {
  createInteractionsClient,
  type InteractionsClient,
  type InteractionsClientConfig,
} from './client.js';

export {
  type CallerAuth,
  type DelegationWire,
  type TransportConfig,
} from './transport.js';

export {
  InteractionsError,
  isCeremonyRequired,
  type InteractionsErrorCode,
} from './errors.js';

export type {
  StorageStatus,
  Topic,
  TopicMessage,
  TopicListing,
  DirectoryMember,
  MessagingWireStatus,
  SendResult,
  LibraryArtifact,
  LibraryCatalog,
} from './types.js';
