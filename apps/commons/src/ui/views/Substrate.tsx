import { useEffect, useState } from 'react';
import type { Me, OrgSummary } from '../../shared/api-types.js';
import { api } from '../api.js';

interface ChainFacts {
  chainId: number;
  network: string;
  contracts: Record<string, string>;
}

/**
 * "Under the hood" — the panel most demos leave out.
 *
 * It exists because the claims this app makes are checkable, and a claim nobody can check is
 * marketing. Every value here is something a person could look up themselves on Base Sepolia:
 * their own agent address, the delegation hash a revoke would name, the contracts the gates read.
 *
 * Ship something like this. An app that holds authority over somebody's organization should be
 * able to tell them exactly which delegation that is and how to kill it.
 */
export function Substrate({ me, orgs }: { me: Me; orgs: OrgSummary[] }) {
  const [chain, setChain] = useState<ChainFacts | null>(null);

  useEffect(() => {
    void api.get<ChainFacts>('/api/chain').then(setChain).catch(() => setChain(null));
  }, []);

  const explorer = (addr: string): string => `https://sepolia.basescan.org/address/${addr}`;

  return (
    <>
      <div className="panel">
        <h2>You</h2>
        <div className="scroll-x">
          <table className="facts">
            <tbody>
              <tr>
                <td>Smart Agent</td>
                <td>
                  <a href={explorer(me.person)} target="_blank" rel="noreferrer">
                    {me.person}
                  </a>
                </td>
              </tr>
              <tr>
                <td>agent name</td>
                <td>{me.agentName ?? '(none claimed)'}</td>
              </tr>
              <tr>
                <td>Home (issuer)</td>
                <td>{me.authOrigin}</td>
              </tr>
              <tr>
                <td>interactions storage</td>
                <td>{me.storage.granted ? (me.storage.current ? 'enabled' : 'enabled but stale') : 'not enabled'}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ marginTop: 8 }}>
          The address is the identity. The name is a facet pointing at it, and rotating credentials — a new
          passkey, a lost wallet — never changes it.
        </p>
      </div>

      <div className="panel">
        <h2>Authority this app holds</h2>
        {orgs.length === 0 && <p className="muted">None. Without a connected organization this app can act only as you.</p>}
        {orgs.map((o) => (
          <div key={o.address} className="item">
            <div className="row">
              <strong>{o.name}</strong>
              {o.steward ? <span className="badge">stewardship wire held</span> : <span className="badge">member</span>}
            </div>
            <div className="scroll-x">
              <table className="facts">
                <tbody>
                  <tr>
                    <td>org agent</td>
                    <td>
                      <a href={explorer(o.address)} target="_blank" rel="noreferrer">
                        {o.address}
                      </a>
                    </td>
                  </tr>
                  {o.delegationHash && (
                    <tr>
                      <td>delegation hash</td>
                      <td>{o.delegationHash}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        {orgs.some((o) => o.delegationHash) && (
          <p className="muted" style={{ marginTop: 8 }}>
            That hash is what an on-chain revoke names. Revoking it stops this app at every gate that checks
            — not just here — and takes nothing away from any other app.
          </p>
        )}
      </div>

      <div className="panel">
        <h2>What the gates read</h2>
        {!chain && <p className="muted">Loading…</p>}
        {chain && (
          <>
            <p className="muted">
              {chain.network} · chain {chain.chainId}
            </p>
            <div className="scroll-x">
              <table className="facts">
                <tbody>
                  {(
                    [
                      ['delegationManager', 'holds revocations — every gate checks isRevoked here'],
                      ['agentAccountFactory', 'deploys Smart Agents (counterfactual addresses)'],
                      ['agentNameRegistry', 'claims names; the name resolves TO an address'],
                      ['allowedTargetsEnforcer', 'the caveat that bounds who a delegation may act on'],
                      ['universalSignatureValidator', 'ERC-1271 / ERC-6492 signature checks for smart accounts'],
                    ] as const
                  ).map(([key, why]) =>
                    chain.contracts[key] ? (
                      <tr key={key}>
                        <td>
                          {key}
                          <br />
                          <span style={{ fontSize: 11 }}>{why}</span>
                        </td>
                        <td>
                          <a href={explorer(chain.contracts[key]!)} target="_blank" rel="noreferrer">
                            {chain.contracts[key]}
                          </a>
                        </td>
                      </tr>
                    ) : null,
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}
