// @starter/home-connect — the relying-app half of Connect.
//
// Your app never runs a credential ceremony. It hands the person off to their Home (the IdP),
// which runs passkey / wallet / Google / email, holds custody, and hands back an OIDC code.
// You exchange the code for an `id_token` signed by the Home, and that token is the ONLY thing
// your app ever holds on the person's behalf.
//
// WHAT THE TOKEN IS AND IS NOT (this is the whole model — see docs/principles.md #3):
//   IS:     proof of WHO. `sub` carries the person's Smart Agent address (CAIP-10).
//   IS NOT: authority. Every gate downstream re-derives what this person may do from an
//           on-chain delegation the PERSON signed — never from a claim in this token.
//
// Runs anywhere WebCrypto does: Cloudflare Workers, Node ≥ 20, the browser. No Node builtins.

export {
  createHomeConnect,
  type HomeConnect,
  type HomeConnectConfig,
  type ConnectStart,
  type ConnectResult,
  type PersonClaims,
  type RelatedOrg,
} from './connect.js';

export {
  resolveHomeOrigin,
  isAllowedHomeOrigin,
  homeLabelOf,
  DEFAULT_HOME_ORIGIN,
  type HomeOriginPolicy,
} from './origins.js';

export { asDelegationWire, type DelegationWire } from './delegation.js';

export { fetchHomeManifest, type HomeTrustVerdict } from './manifest.js';

export { HomeConnectError, type HomeConnectErrorCode } from './errors.js';
