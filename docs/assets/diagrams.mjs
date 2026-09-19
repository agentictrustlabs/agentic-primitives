#!/usr/bin/env node
// Generates the architecture diagrams under docs/assets/ as SVG. No dependencies.
//
//   node docs/assets/diagrams.mjs            # writes docs/assets/*.svg
//
// PNGs beside them are rendered from these SVGs at 3× (5760 px wide) with headless
// Chromium — see the note at the bottom. The SVG is the source; edit here, not the PNG.

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = dirname(fileURLToPath(import.meta.url));

// ── palette ─────────────────────────────────────────────────────────────────────────────────
const C = {
  bg: '#f7f7f5',
  ink: '#1c2330',
  muted: '#5b6675',
  line: '#c9cfd8',
  navy: '#1f3a5f',
  navyLight: '#e6ecf5',
  teal: '#0e7c86',
  tealLight: '#e0f2f3',
  amber: '#b5651d',
  amberLight: '#fbeedd',
  red: '#a23b3b',
  redLight: '#f8e4e4',
  green: '#2f7d4f',
  greenLight: '#e3f1e8',
  purple: '#5b4b8a',
  purpleLight: '#ebe7f5',
  white: '#ffffff',
  gray: '#8a94a3',
  grayLight: '#eef0f3',
};
const FONT = `Inter, "Segoe UI", Helvetica, Arial, sans-serif`;
const MONO = `"JetBrains Mono", "SF Mono", Menlo, Consolas, monospace`;

// ── helpers ─────────────────────────────────────────────────────────────────────────────────
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function text(x, y, s, o = {}) {
  const { size = 22, weight = 400, fill = C.ink, anchor = 'start', family = FONT, italic = false, opacity = 1 } = o;
  return `<text x="${x}" y="${y}" font-family='${family}' font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}"${italic ? ' font-style="italic"' : ''}${opacity < 1 ? ` opacity="${opacity}"` : ''}>${esc(s)}</text>`;
}

/** Multi-line text; lines is an array. */
function lines(x, y, arr, o = {}) {
  const { size = 20, lh = size * 1.35 } = o;
  return arr.map((s, i) => text(x, y + i * lh, s, { ...o, size })).join('');
}

function box(x, y, w, h, o = {}) {
  const { fill = C.white, stroke = C.line, sw = 2, r = 12, dash = null, opacity = 1 } = o;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${dash ? ` stroke-dasharray="${dash}"` : ''}${opacity < 1 ? ` opacity="${opacity}"` : ''}/>`;
}

/** A titled card: header band + body lines. */
function card(x, y, w, h, title, body = [], o = {}) {
  const { accent = C.navy, accentLight = C.navyLight, titleSize = 24, bodySize = 18, mono = false } = o;
  const head = 46;
  return [
    box(x, y, w, h, { fill: C.white, stroke: accent, sw: 2.5 }),
    `<path d="M${x + 12} ${y} H${x + w - 12} a12 12 0 0 1 12 12 V${y + head} H${x} V${y + 12} a12 12 0 0 1 12 -12 Z" fill="${accentLight}"/>`,
    text(x + 18, y + 31, title, { size: titleSize, weight: 700, fill: accent }),
    lines(x + 18, y + head + 30, body, { size: bodySize, fill: C.ink, family: mono ? MONO : FONT, lh: bodySize * 1.45 }),
  ].join('');
}

function pill(x, y, s, o = {}) {
  const { fill = C.tealLight, stroke = C.teal, color = C.teal, size = 17, weight = 600, padX = 14 } = o;
  const w = s.length * size * 0.58 + padX * 2;
  const h = size + 16;
  return [
    box(x, y, w, h, { fill, stroke, sw: 1.5, r: h / 2 }),
    text(x + w / 2, y + h / 2 + size * 0.36, s, { size, weight, fill: color, anchor: 'middle' }),
  ].join('') + `<!--w=${w}-->`;
}

function pillRow(x, y, items, o = {}) {
  let cx = x;
  let out = '';
  const gap = o.gap ?? 10;
  for (const s of items) {
    const p = pill(cx, y, s, o);
    out += p;
    cx += Number(p.match(/<!--w=([\d.]+)-->/)[1]) + gap;
  }
  return out;
}

function arrow(x1, y1, x2, y2, o = {}) {
  const { stroke = C.navy, sw = 3, dash = null, marker = 'arrow', label = null, labelSize = 17, labelFill = C.muted } = o;
  let out = `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${sw}"${dash ? ` stroke-dasharray="${dash}"` : ''} marker-end="url(#${marker})"/>`;
  if (label) {
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2 - 10;
    out += text(mx, my, label, { size: labelSize, fill: labelFill, anchor: 'middle', weight: 600 });
  }
  return out;
}

function path(d, o = {}) {
  const { stroke = C.navy, sw = 3, dash = null, marker = 'arrow', fill = 'none' } = o;
  return `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${dash ? ` stroke-dasharray="${dash}"` : ''}${marker ? ` marker-end="url(#${marker})"` : ''}/>`;
}

function defs() {
  const m = (id, color) =>
    `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="${color}"/></marker>`;
  return `<defs>${m('arrow', C.navy)}${m('arrowTeal', C.teal)}${m('arrowAmber', C.amber)}${m('arrowRed', C.red)}${m('arrowGray', C.gray)}${m('arrowGreen', C.green)}</defs>`;
}

function svg(w, h, title, subtitle, body, footer) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
${defs()}
<rect width="${w}" height="${h}" fill="${C.bg}"/>
${text(64, 74, title, { size: 44, weight: 800, fill: C.ink })}
${text(64, 112, subtitle, { size: 23, fill: C.muted })}
${body}
${text(64, h - 34, footer, { size: 15, fill: C.gray })}
${text(w - 64, h - 34, 'agentictrustlabs/agentic-primitives', { size: 15, fill: C.gray, anchor: 'end' })}
</svg>`;
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 1. The scope of the substrate
// ═══════════════════════════════════════════════════════════════════════════════════════════
function substrateScope() {
  const W = 1920, H = 1240;
  let b = '';

  // Left rail: ontology
  b += box(64, 150, 150, 950, { fill: C.purpleLight, stroke: C.purple, sw: 2.5 });
  b += `<g transform="translate(139 625) rotate(-90)">${text(0, 0, 'ONTOLOGY — one vocabulary, bound by IRI, enforced by a build gate', { size: 22, weight: 800, fill: C.purple, anchor: 'middle' })}</g>`;
  b += `<g transform="translate(180 625) rotate(-90)">${text(0, 0, 'T-box · SHACL shapes · vault-record bindings · PROV-O · on-chain term + shape registries', { size: 17, fill: C.purple, anchor: 'middle' })}</g>`;

  // Right rail: skills corpus
  b += box(1706, 150, 150, 950, { fill: C.greenLight, stroke: C.green, sw: 2.5 });
  b += `<g transform="translate(1781 625) rotate(90)">${text(0, 0, 'SKILLS CORPUS — behaviour authored and verifiable; grants nothing', { size: 22, weight: 800, fill: C.green, anchor: 'middle' })}</g>`;
  b += `<g transform="translate(1740 625) rotate(90)">${text(0, 0, 'archetypes · playbook contracts · domain libraries · Merkle log · assigned by digest', { size: 17, fill: C.green, anchor: 'middle' })}</g>`;

  const L = 240, R = 1680, Wd = R - L;

  // Row 0: principals + outside entrances
  b += text(L, 176, 'PRINCIPALS AND ENTRANCES', { size: 16, weight: 800, fill: C.muted });
  const ent = [
    ['People', 'passkey · Home ceremony'],
    ['Organizations', 'quorums · trustees'],
    ['Service agents', 'treasuries · coordinators'],
    ['Claude.ai', 'Home MCP → your own agent'],
    ['Coding runtimes', 'ACP: Claude Code · goose'],
    ['Peer A2A agents', 'any A2A 1.0 client'],
    ['Outside tools', 'connectors under delegation'],
  ];
  const ew = (Wd - 6 * 14) / 7;
  ent.forEach(([t, s], i) => {
    const x = L + i * (ew + 14);
    b += box(x, 190, ew, 78, { fill: C.white, stroke: C.line });
    b += text(x + ew / 2, 222, t, { size: 18, weight: 700, anchor: 'middle' });
    b += text(x + ew / 2, 250, s, { size: 14, fill: C.muted, anchor: 'middle' });
  });
  b += arrow(L + Wd / 2, 274, L + Wd / 2, 318, { stroke: C.gray, marker: 'arrowGray', label: 'admission — HTTPS required · mTLS optional · admission always' });

  // Row 1: products
  b += text(L, 344, 'PRODUCTS — each in its own repository, importing published packages', { size: 16, weight: 800, fill: C.muted });
  const prods = [
    ['Home', ['the person\'s / org\'s own agent', 'the Ask · the harness · vault', 'treasuries · Home MCP · roster']],
    ['Discovery', ['the registry as an agent', 'public KB · ARD/ACP · explorer', 'the AP Gateway (MCP façade)']],
    ['Naming', ['typed names on chain', 'private + pairwise resolution', 'sequenced publications']],
    ['Home Build', ['behaviour: author → assign → run', 'code: the review loop on GitHub', 'promotion bound to an intent']],
    ['Developer Kit', ['this repo · npx ap · create-app', 'doctor · upgrade · conform', 'read-only Developer MCP']],
  ];
  const pw = (Wd - 4 * 16) / 5;
  prods.forEach(([t, body], i) => {
    const x = L + i * (pw + 16);
    b += card(x, 358, pw, 150, t, body, { accent: C.navy, accentLight: C.navyLight, titleSize: 24, bodySize: 15 });
  });

  b += arrow(L + Wd / 2, 514, L + Wd / 2, 556, { stroke: C.gray, marker: 'arrowGray', label: 'import @agenticprimitives/* at exact, coherent versions — never a fork' });

  // Row 2: the nine offerings (packages)
  b += text(L, 582, 'RING 0 — 75 PACKAGES AS NINE OFFERINGS (an offering depends only on those below it)', { size: 16, weight: 800, fill: C.muted });
  const offs = [
    ['Harness', ['harness · orchestration', 'context · evaluation', 'plan → verify → approve', '→ re-verify → act → receipt'], C.amber, C.amberLight],
    ['Coordination', ['coordination · collaboration', 'situations · organization', 'fabric · intent-engagement', 'endeavor · commitment'], C.teal, C.tealLight],
    ['Evidence', ['audit · provenance', 'verification-receipts · witness', 'attestations · agreements', 'content-primitives/-storage'], C.teal, C.tealLight],
    ['Edge', ['a2a · admission', 'edge-runtime · -cloudflare', 'mcp-protocol · -runtime · -oauth', 'rate-control'], C.teal, C.tealLight],
    ['Registry Kit', ['registry-kit', 'registry-resolution', 'agent-resolution · surface-catalog', 'intent-resolver · -marketplace'], C.teal, C.tealLight],
  ];
  const ow = (Wd - 4 * 16) / 5;
  offs.forEach(([t, body, a, al], i) => {
    const x = L + i * (ow + 16);
    b += card(x, 596, ow, 168, t, body, { accent: a, accentLight: al, titleSize: 22, bodySize: 15 });
  });
  const offs2 = [
    ['Authority', ['delegation · tool-policy', 'key-custody · key-authorization', 'entitlements · vault-authority', 'delegated-signer · admission'], C.amber, C.amberLight],
    ['Identity', ['types · agent-account', 'account-custody · agent-naming', 'agent-profile · -relationships', 'connect · connect-auth · fedcm'], C.navy, C.navyLight],
    ['Ontology', ['ontology', 'IRIs · SHACL · vault records', 'party roles · plan shapes', 'bound from every package'], C.purple, C.purpleLight],
    ['Operations', ['audit · evaluation · devkit', 'OpenTelemetry three layers', 'live gates nightly', 'per-op bills'], C.teal, C.tealLight],
  ];
  const ow2 = (Wd - 3 * 16) / 4;
  offs2.forEach(([t, body, a, al], i) => {
    const x = L + i * (ow2 + 16);
    b += card(x, 780, ow2, 168, t, body, { accent: a, accentLight: al, titleSize: 22, bodySize: 15 });
  });

  b += arrow(L + Wd / 2, 954, L + Wd / 2, 992, { stroke: C.gray, marker: 'arrowGray', label: 'readContract only · fail closed · ABIs and addresses ship in the same artifact' });

  // Row 3: chain
  b += box(L, 1002, Wd, 98, { fill: C.navy, stroke: C.navy });
  b += text(L + 24, 1036, 'CHAIN — 43 contracts · Base Sepolia (public, verified) + the estate chain (mandate path)', { size: 22, weight: 800, fill: C.white });
  b += text(L + 24, 1064, 'AgentAccount + Factory (ERC-4337 / 7579 / 1271) · CustodyPolicy · DelegationManager + 8 caveat enforcers incl. DigestBinding + Payment · typed-name registries', { size: 15, fill: '#d6dfeb' });
  b += text(L + 24, 1086, 'ontology + shape registries · attestation · agreement · payment receipt · registry base · governance + timelock', { size: 15, fill: '#d6dfeb' });

  // Right-side cross-cutting annotations between rails and content
  return svg(W, H, 'The scope of the Agentic Primitives substrate',
    'One anchor per agent. Nine offerings as packages. Three products and a kit on top. One ontology through everything; behaviour beside it, never authority.',
    b,
    'Ring 0 = packages + contracts + ontology + Developer Kit (ADR-0063) · products in their own repositories · the skills corpus imports the packages, never the reverse');
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 2. One turn through the harness
// ═══════════════════════════════════════════════════════════════════════════════════════════
function harnessTurn() {
  const W = 1920, H = 1160;
  let b = '';

  // The planner box (isolated, top)
  b += box(700, 150, 520, 120, { fill: C.grayLight, stroke: C.gray, dash: '10 8' });
  b += text(960, 192, 'PLANNER — an LLM behind a port', { size: 22, weight: 800, fill: C.muted, anchor: 'middle' });
  b += text(960, 222, 'proposes steps · may be wrong, hijacked, or creative', { size: 18, fill: C.muted, anchor: 'middle' });
  b += text(960, 250, 'never consulted about whether a step is allowed', { size: 18, fill: C.red, weight: 700, anchor: 'middle' });

  // The main sequence
  const steps = [
    ['1 Scope', ['the app says where', 'you stand — never', 'a permission input'], C.gray, C.grayLight],
    ['2 Classify', ['sentence → typed', 'intent + outcome', 'capability from the', 'behaviour definition'], C.purple, C.purpleLight],
    ['3 Resolve', ['"Alice" among the', 'people you know;', 'whose treasury via', 'charteredUnder'], C.purple, C.purpleLight],
    ['4 Plan', ['steps, each naming', 'a tool with a', 'DECLARED risk floor', 'the plan cannot lower'], C.gray, C.grayLight],
    ['5 Verify', ['signature vs account', 'revocation on chain', 'caveats vs THIS call', 'live grant or pause'], C.amber, C.amberLight],
    ['6 Approve', ['a passkey signature', 'over the mandate:', 'intent digest +', 'single-use nonce'], C.amber, C.amberLight],
    ['7 Re-verify', ['a pause is a window', 'in which revocation', 'may have happened;', 'checkpoint ≠ truth'], C.amber, C.amberLight],
    ['8 Execute', ['message · vault write', 'A2A hand-off · a', 'treasury payment —', 'enforcers run again'], C.teal, C.tealLight],
    ['9 Receipt', ['tool · risk · mandate', 'decision · approvals', 'tx hash · playbook', 'digest → the vault'], C.green, C.greenLight],
  ];
  const L = 64, R = 1856, gap = 14;
  const sw = (R - L - gap * 8) / 9;
  const Y = 330, SH = 200;
  steps.forEach(([t, body, a, al], i) => {
    const x = L + i * (sw + gap);
    b += card(x, Y, sw, SH, t, body, { accent: a, accentLight: al, titleSize: 22, bodySize: 16 });
    if (i < 8) b += `<path d="M${x + sw + 1} ${Y + SH / 2} L${x + sw + gap - 2} ${Y + SH / 2}" stroke="${C.navy}" stroke-width="3" marker-end="url(#arrow)"/>`;
  });

  // planner → plan
  b += path(`M960 272 C960 300 ${L + 3 * (sw + gap) + sw / 2} 300 ${L + 3 * (sw + gap) + sw / 2} ${Y - 4}`, { stroke: C.gray, marker: 'arrowGray', dash: '8 6' });
  b += text(L + 3 * (sw + gap) + sw / 2 - 16, 300, 'proposes', { size: 16, fill: C.muted, weight: 600, anchor: 'end' });

  // authority bracket over 5-7
  const ax = L + 4 * (sw + gap), aw = 3 * sw + 2 * gap;
  b += box(ax - 8, Y - 46, aw + 16, 36, { fill: C.amberLight, stroke: C.amber, r: 18 });
  b += text(ax + aw / 2, Y - 21, 'AUTHORITY — nothing here consults the planner', { size: 18, weight: 800, fill: C.amber, anchor: 'middle' });

  // callouts under 5, 7, 8, 9 — each the width of its step
  const callout = (i, stroke, fill, color, ls) => {
    const x = L + i * (sw + gap);
    const cxx = x + sw / 2;
    const marker = stroke === C.amber ? 'arrowAmber' : stroke === C.red ? 'arrowRed' : stroke === C.teal ? 'arrowTeal' : 'arrowGreen';
    b += path(`M${cxx} ${Y + SH} L${cxx} ${Y + SH + 40}`, { stroke, marker });
    b += box(x, Y + SH + 44, sw, 112, { fill, stroke, sw: 2 });
    b += lines(x + 10, Y + SH + 70, ls, { size: 13, fill: color, weight: 600, lh: 20 });
  };
  callout(4, C.amber, C.white, C.ink, ['no mandate yet →', 'input-required, naming', 'EXACTLY which signature', 'is needed; the run parks']);
  callout(6, C.red, C.redLight, C.red, ['grant gone →', 'TERMINAL denial', 'not retryable — a revoked', 'grant is not weather']);
  callout(7, C.teal, C.tealLight, C.teal, ['enforcers run AGAIN', 'at commit, on chain:', 'payee · ceiling · nonce', '· intent digest']);
  callout(8, C.green, C.greenLight, C.green, ['→ owner\'s vault (PROV-O)', '→ hash-chained audit', '→ public projection of', '   anchored digests']);

  // Bottom: what verifies what, three checks
  const by = 730;
  b += text(64, by, 'THE THREE PLACES A GRANT IS CHECKED — nothing is cached between them except the inputs to the check', { size: 18, weight: 800, fill: C.muted });
  const checks = [
    ['Before the step', 'The harness reads the delegation, checks the signature against the delegator\'s account, checks isRevoked on chain, checks the caveats cover THIS tool, resource and arguments — compared in the ontology\'s vocabulary, not a guess.'],
    ['After every approval', 'A human approval is a pause during which the world may have changed. Resuming re-verifies. A checkpointed "approved" is never sufficient on its own — the durable executor\'s default was the opposite, so the rule was written down first.'],
    ['At redemption', 'The chain\'s enforcers run in the same transaction as the act. Even a runtime that skips its own checks cannot move value outside the caveats. This is the residue no off-chain verifier can close.'],
  ];
  const cw = (R - L - 2 * 20) / 3;
  checks.forEach(([t, body], i) => {
    const x = L + i * (cw + 20);
    b += box(x, by + 16, cw, 210, { fill: C.white, stroke: C.amber, sw: 2 });
    b += text(x + 20, by + 52, t, { size: 22, weight: 800, fill: C.amber });
    const words = body.split(' ');
    const ls = [];
    let cur = '';
    for (const w of words) {
      if ((cur + ' ' + w).length > 62) { ls.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w;
    }
    ls.push(cur);
    b += lines(x + 20, by + 86, ls, { size: 17, fill: C.ink, lh: 25 });
  });

  b += box(64, 984, 1792, 74, { fill: C.navy, stroke: C.navy });
  b += text(960, 1015, 'Intelligence may be probabilistic. Authority must not be.', { size: 26, weight: 800, fill: C.white, anchor: 'middle' });
  b += text(960, 1044, 'The planner may be wrong about HOW. It is never consulted about WHETHER.', { size: 18, fill: '#d6dfeb', anchor: 'middle' });

  return svg(W, H, 'One turn through the authority-aware harness',
    'A request from a person in their Home, or from another agent over A2A. Nine steps; three of them verify; one of them signs; one of them proves.',
    b,
    'spec 350 (harness) · 352 (the Ask) · 362 (durable executor) · 383 (chain on the receipt) · 389 (one PROV graph) · 395 (public provenance)');
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 3. The anchor and its projections
// ═══════════════════════════════════════════════════════════════════════════════════════════
function anchorProjections() {
  const W = 1920, H = 1160;
  let b = '';
  const cx = 960, cy = 600;

  // Anchor
  b += `<circle cx="${cx}" cy="${cy}" r="170" fill="${C.navy}"/>`;
  b += `<circle cx="${cx}" cy="${cy}" r="170" fill="none" stroke="${C.navyLight}" stroke-width="6"/>`;
  b += text(cx, cy - 46, 'THE ANCHOR', { size: 26, weight: 800, fill: C.white, anchor: 'middle' });
  b += text(cx, cy - 12, 'an ERC-4337 smart account', { size: 19, fill: '#d6dfeb', anchor: 'middle' });
  b += text(cx, cy + 16, 'verifies signatures (ERC-1271)', { size: 17, fill: '#d6dfeb', anchor: 'middle' });
  b += text(cx, cy + 42, 'holds value · issues and revokes', { size: 17, fill: '#d6dfeb', anchor: 'middle' });
  b += text(cx, cy + 68, 'delegations · executes logic', { size: 17, fill: '#d6dfeb', anchor: 'middle' });
  b += text(cx, cy + 108, 'the address never changes', { size: 17, weight: 700, fill: C.amberLight, anchor: 'middle' });

  // Projections (top arc)
  const proj = [
    ['Typed name', 'alice.me · outreach.team · outreach.treasury', 'suffix = agent class, checked on chain'],
    ['A2A Agent Card', 'capabilities, endpoints', 'JWS-signed, bound by an EIP-712 proof'],
    ['Registry entry', 'the kit · ERC-8004 · ANS · HCS', 'a listing + an admission receipt'],
    ['DNS host', '<label>-<type>.<zone>', 'the same name for legacy resolvers'],
    ['did:web · ENS', 'where the anchor is served', 'a locator, never the identity'],
    ['Service publication', 'where it is right now', 'sequenced · expiring · per audience'],
  ];
  const n = proj.length;
  proj.forEach(([t, s1, s2], i) => {
    const ang = Math.PI + (i + 0.5) * (Math.PI / n); // top half
    const rx = 720, ry = 330;
    const x = cx + rx * Math.cos(ang), y = cy + ry * Math.sin(ang);
    const bw = 340, bh = 92;
    b += box(x - bw / 2, y - bh / 2, bw, bh, { fill: C.white, stroke: C.teal, sw: 2 });
    b += text(x, y - 18, t, { size: 20, weight: 800, fill: C.teal, anchor: 'middle' });
    b += text(x, y + 6, s1, { size: 12.5, fill: C.ink, anchor: 'middle', family: MONO });
    b += text(x, y + 28, s2, { size: 14, fill: C.muted, anchor: 'middle' });
    // arrow from anchor outward
    const ux = Math.cos(ang), uy = Math.sin(ang);
    b += arrow(cx + 176 * ux, cy + 176 * uy, x - ux * (bw / 2 + 4), y - uy * (bh / 2 + 4), { stroke: C.teal, marker: 'arrowTeal', sw: 2.5 });
  });
  b += box(cx - 560, 140, 1120, 40, { fill: C.tealLight, stroke: C.teal, r: 20 });
  b += text(cx, 167, 'PROJECTIONS — deterministic renderings, each carrying a proof the anchor signed. Delete one: you lost a listing.', { size: 16, weight: 700, fill: C.teal, anchor: 'middle' });

  // Custody (bottom-left)
  b += card(90, 790, 500, 236, 'CUSTODY — credentials beneath the anchor', [
    'passkeys · hardware wallets · SIWE EOAs · KMS session keys',
    'added, replaced, removed under the CustodyPolicy module:',
    'trustee quorum · guardian quorum · multi-credential recovery',
    '',
    'Rotate a key: nothing has to be re-signed.',
    'A compromised key is not a compromised agent.',
  ], { accent: C.navy, accentLight: C.navyLight, titleSize: 19, bodySize: 15 });
  b += arrow(590, 860, cx - 120, cy + 130, { stroke: C.navy, sw: 2.5, label: 'may sign for' });

  // Delegations (bottom-right)
  b += card(1330, 790, 500, 236, 'DELEGATIONS — what others may do', [
    'to an app: a stewardship wire (scoped, revocable)',
    'to a service: one selector, pinned targets, time-bound',
    'to a treasury (chartered under it): a MANDATE —',
    '  intent digest + payee + ceiling + single-use nonce',
    '',
    'A token says WHO. A delegation says WHAT.',
  ], { accent: C.amber, accentLight: C.amberLight, titleSize: 19, bodySize: 15 });
  b += arrow(cx + 120, cy + 130, 1330, 860, { stroke: C.amber, marker: 'arrowAmber', sw: 2.5, label: 'grants, narrowed by caveats' });

  // Treasury (bottom-centre)
  b += box(cx - 190, 820, 380, 120, { fill: C.amberLight, stroke: C.amber, sw: 2 });
  b += text(cx, 856, 'TREASURY — its own service agent', { size: 19, weight: 800, fill: C.amber, anchor: 'middle' });
  b += text(cx, 884, 'charteredUnder the person or org', { size: 16, fill: C.ink, anchor: 'middle', family: MONO });
  b += text(cx, 910, 'the principal authorizes; the treasury transacts', { size: 15, fill: C.muted, anchor: 'middle' });
  b += arrow(cx, cy + 176, cx, 816, { stroke: C.amber, marker: 'arrowAmber', sw: 2.5 });

  // Three classes ribbon
  b += box(64, 1060, 1792, 44, { fill: C.purpleLight, stroke: C.purple, r: 22 });
  b += text(960, 1089, 'Every anchor is exactly one of three PROV-O classes — Person · Organization · SoftwareAgent — and the ontology says what each relationship is NOT: charteredUnder is never authority.', { size: 16, weight: 700, fill: C.purple, anchor: 'middle' });

  return svg(W, H, 'The anchor and its projections',
    'The agent is an account. Names, cards, registry entries, DNS hosts and DIDs are projections of it. Credentials rotate beneath it; authority is granted from it.',
    b,
    'ADR-0010 (canonical id) · ADR-0011 (recovery) · ADR-0061 (typed suffixes) · ADR-0062 (card projection) · spec 338 (publications) · 346/347 (names, cards)');
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 4. Rails, not throttles — the control points
// ═══════════════════════════════════════════════════════════════════════════════════════════
function railsAndControls() {
  const W = 1920, H = 1240;
  let b = '';

  // Left: the throttle
  b += box(64, 150, 520, 300, { fill: C.redLight, stroke: C.red, sw: 2.5 });
  b += text(324, 192, 'A THROTTLE', { size: 26, weight: 800, fill: C.red, anchor: 'middle' });
  b += `<circle cx="324" cy="290" r="58" fill="${C.white}" stroke="${C.red}" stroke-width="4"/>`;
  b += `<line x1="324" y1="290" x2="358" y2="248" stroke="${C.red}" stroke-width="6" stroke-linecap="round"/>`;
  b += text(324, 385, 'one dial · applied to everything', { size: 18, fill: C.red, weight: 700, anchor: 'middle' });
  b += text(324, 412, 'slower is not safer; a stopped agent is not', { size: 15, fill: C.muted, anchor: 'middle' });
  b += text(324, 434, 'accountable, and a stale verdict still authorizes', { size: 15, fill: C.muted, anchor: 'middle' });

  // Right of throttle: the question
  b += box(620, 150, 1236, 300, { fill: C.white, stroke: C.line });
  b += text(640, 194, 'What the calls to “slow down” are actually asking for', { size: 24, weight: 800 });
  const asks = [
    ['Throttle · suspend · shut down', 'AI Kill Switch Act (July 2026) — the capability to slow or stop a system, on order'],
    ['Preserve forensic records', 'incident reporting; evidence a third party can examine after the fact'],
    ['Know where the agents are', '< 50% of CISOs can say what their agents can access or are authorized to do'],
    ['Stop one, not all', 'a revoked helper stops NOW — not when a token expires, not when a CRL propagates'],
    ['Human oversight that binds', 'an approval that the action cannot proceed without — not a click the app could skip'],
  ];
  asks.forEach(([t, s], i) => {
    const y = 236 + i * 42;
    b += `<circle cx="652" cy="${y - 7}" r="6" fill="${C.navy}"/>`;
    b += text(672, y, t, { size: 19, weight: 700 });
    b += text(1010, y, s, { size: 16, fill: C.muted });
  });

  // The rails: seven control points as a track
  b += text(64, 500, 'RAILS — seven control points, each held by someone other than the runtime, each stopping a specific thing', { size: 18, weight: 800, fill: C.muted });
  const rails = [
    ['Admission', 'the edge', ['may these bytes enter,', 'for this route?', 'rate limits · budgets ·', 'correlation id minted here'], 'stops: floods, replays,', 'unadmitted traffic'],
    ['Custody', 'person / quorum', ['who may sign for', 'this anchor at all?', 'rotate · recover ·', 'never change the address'], 'stops: a leaked key', 'becoming an identity'],
    ['Authority', 'the principal', ['a delegation, ERC-1271,', 'caveats, unrevoked —', 'checked before EVERY', 'step; scope narrows only'], 'stops: acting beyond', 'what was granted'],
    ['Mandate', 'the person\'s yes', ['intent digest + payee', '+ ceiling + single-use', 'nonce; the "yes" IS', 'the signature'], 'stops: wrong payee,', 'wrong amount, twice'],
    ['Risk ladder', 'the playbook', ['risk declared by the', 'TOOL, never the plan;', 'requirement: none ·', 'grant · mandate · human'], 'stops: a plan calling', 'a payment "low risk"'],
    ['Enforcers', 'the chain', ['the caveats run again', 'in the same transaction', 'as the act — a skipped', 'off-chain check is moot'], 'stops: a compromised', 'runtime moving value'],
    ['Revocation', 'the principal', ['isRevoked read per step;', 'next step is a TERMINAL', 'denial; triggers carry', 'budgets; runs park'], 'stops: one agent,', 'everywhere, now'],
  ];
  const L = 64, R = 1856, gap = 12;
  const rw = (R - L - gap * 6) / 7;
  const Y = 520, RH = 300;
  // track line
  b += `<line x1="${L}" y1="${Y + RH + 40}" x2="${R}" y2="${Y + RH + 40}" stroke="${C.navy}" stroke-width="6"/>`;
  rails.forEach(([t, who, body, s1, s2], i) => {
    const x = L + i * (rw + gap);
    const accent = i >= 2 && i <= 5 ? C.amber : C.navy;
    const light = i >= 2 && i <= 5 ? C.amberLight : C.navyLight;
    b += card(x, Y, rw, RH, `${i + 1} ${t}`, [], { accent, accentLight: light, titleSize: 21 });
    b += text(x + 18, Y + 74, `held by: ${who}`, { size: 15, weight: 700, fill: accent });
    b += lines(x + 18, Y + 102, body, { size: 15, fill: C.ink, lh: 22 });
    b += box(x + 12, Y + RH - 70, rw - 24, 58, { fill: C.redLight, stroke: C.red, sw: 1.5, r: 8 });
    b += text(x + rw / 2, Y + RH - 46, s1, { size: 14, weight: 700, fill: C.red, anchor: 'middle' });
    b += text(x + rw / 2, Y + RH - 26, s2, { size: 14, weight: 700, fill: C.red, anchor: 'middle' });
    // tick on track
    b += `<circle cx="${x + rw / 2}" cy="${Y + RH + 40}" r="10" fill="${C.white}" stroke="${accent}" stroke-width="4"/>`;
  });
  b += text(L, Y + RH + 78, 'an act travels the track left to right — and can be stopped at any point by the party that holds that point, without the runtime\'s cooperation', { size: 16, fill: C.muted, italic: true });

  // Evidence row
  const ey = 920;
  b += box(64, ey, 1792, 120, { fill: C.greenLight, stroke: C.green, sw: 2.5 });
  b += text(84, ey + 40, 'EVIDENCE — the forensic record the runtime does not own', { size: 22, weight: 800, fill: C.green });
  b += text(84, ey + 72, 'Every protected step: tool · declared risk · mandate reference · verifier decision · who approved over which digest · tx hash · the digest of the playbook that admitted the run.', { size: 16, fill: C.ink });
  b += text(84, ey + 98, 'Into the owner\'s vault as a PROV-O graph, a hash-chained audit sink, and a public projection of anchored digests a counterparty can verify without trusting anyone here.', { size: 16, fill: C.ink });

  // Bottom line
  b += box(64, 1064, 1792, 74, { fill: C.navy, stroke: C.navy });
  b += text(960, 1095, 'A throttle slows the agent. Rails bound what it can do, let the right person stop it, and leave proof either way.', { size: 24, weight: 800, fill: C.white, anchor: 'middle' });
  b += text(960, 1124, 'The kill switch is a revoke transaction: from that block on, every gate refuses and every enforcer reverts — without the runtime\'s cooperation.', { size: 17, fill: '#d6dfeb', anchor: 'middle' });

  return svg(W, H, 'Rails, not throttles',
    'The world is asking for a way to slow AI agents down. A speed limit on a road with no lanes is not a control. These are the lanes — and who holds each one.',
    b,
    'ADR-0057 (admission) · spec 207/221 (custody) · 350 (per-step verification) · 336 §8.3 / 351 (mandates) · 375 (trigger budgets) · 383/395 (receipts, public provenance)');
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
const files = {
  'substrate-scope.svg': substrateScope(),
  'harness-one-turn.svg': harnessTurn(),
  'anchor-and-projections.svg': anchorProjections(),
  'rails-not-throttles.svg': railsAndControls(),
};
for (const [name, content] of Object.entries(files)) {
  writeFileSync(join(OUT, name), content);
  console.log('wrote', name);
}

// To render PNGs at 3× (5760 px wide) with headless Chromium:
//   node -e "const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();
//     for (const f of ['substrate-scope','harness-one-turn','anchor-and-projections','rails-not-throttles']) {
//       const p=await b.newPage({deviceScaleFactor:3});await p.goto('file://'+process.cwd()+'/docs/assets/'+f+'.svg');
//       await p.screenshot({path:'docs/assets/'+f+'.png',fullPage:true});} await b.close();})()"
