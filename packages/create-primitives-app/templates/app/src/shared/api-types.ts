export interface Me {
  person: string;
  agentName: string | null;
  authOrigin: string;
  storage: { granted: boolean; current: boolean };
}

export interface OrgSummary {
  address: string;
  name: string;
  steward: boolean;
  delegationHash?: string;
  storage: { granted: boolean; current: boolean };
}

export interface ApiError {
  error: string;
  code?: string;
  ceremonyUrl?: string;
}
