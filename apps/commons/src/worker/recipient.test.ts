import { describe, expect, it } from 'vitest';
import { classifyRecipient, memberAddressByName, toPublicAgentName } from './recipient.js';

const ORG = '0x1111111111111111111111111111111111111111';
const ALICE = '0xc35c8f17c9cbf58c20a4f4cd8bd702b8c91f532b';

describe('classifyRecipient', () => {
  it('uses an address as an address', () => {
    expect(classifyRecipient(ALICE, ORG)).toEqual({ kind: 'address', address: ALICE });
  });

  it('uses a dotted name as a public agent name', () => {
    expect(classifyRecipient('rich-google.impact', ORG)).toEqual({
      kind: 'agent-name',
      agentName: 'rich-google.impact',
    });
  });

  it('uses a bare label as an org member when a community is selected', () => {
    expect(classifyRecipient('rich10-pedersen', ORG)).toEqual({
      kind: 'org-member',
      name: 'rich10-pedersen',
      org: ORG,
    });
  });

  it('uses a bare label as label.impact when no community is selected', () => {
    expect(classifyRecipient('rich-google', null)).toEqual({
      kind: 'agent-name',
      agentName: 'rich-google.impact',
    });
  });
});

describe('toPublicAgentName', () => {
  it('leaves a dotted name alone', () => {
    expect(toPublicAgentName('Nathan.Impact')).toBe('nathan.impact');
  });

  it('appends .impact to a bare label', () => {
    expect(toPublicAgentName('rich10-pedersen')).toBe('rich10-pedersen.impact');
  });
});

describe('memberAddressByName', () => {
  const members = [
    { subject: `eip155:84532:${ALICE}`, displayName: 'Rich 10 Pedersen', localName: 'rich10-pedersen' },
  ];

  it('matches the org-local name', () => {
    expect(memberAddressByName(members, 'rich10-pedersen')).toBe(ALICE);
  });

  it('matches the listing display name', () => {
    expect(memberAddressByName(members, 'Rich 10 Pedersen')).toBe(ALICE);
  });

  it('returns null when nobody in the community is known as that', () => {
    expect(memberAddressByName(members, 'nobody')).toBeNull();
  });
});
