'use client';

import { useState, useCallback } from 'react';

// ── Types ──────────────────────────────────────────────
interface AuditEntry {
  id: number;
  mandateId: number;
  agent: string;
  recipient: string;
  token: string;
  amount: string;
  approved: boolean;
  reason: string;
  timestamp: number;
}

interface Mandate {
  id: number;
  agent: string;
  principal: string;
  totalCap: string;
  singleMax: string;
  spent: string;
  active: boolean;
}

// ── Demo state ─────────────────────────────────────────
const DEMO_WALLETS = {
  principal: '0x7a25...3fD1',
  agent: '0x8b3C...9aE2',
  recipient: '0x4d1F...7bC3',
  unverified: '0x0000...0000',
  dirtyToken: '0xDEAD...BEEF',
};

const TOKENS = {
  USDC_CVA: { name: 'CVA-USDC', addr: '0xA0b8...1E3F', verified: true },
  USDT_CVA: { name: 'CVA-USDT', addr: '0x1f98...4C2A', verified: true },
  RANDOM:   { name: 'UNV-TOKEN', addr: '0xDEAD...BEEF', verified: false },
};

export default function Home() {
  const [mandates, setMandates] = useState<Mandate[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [gateLog, setGateLog] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [showContracts, setShowContracts] = useState(false);

  let nextId = 1;
  const getNextId = () => mandates.length + 1;

  const addMandate = useCallback(() => {
    const id = getNextId();
    const m: Mandate = {
      id,
      agent: DEMO_WALLETS.agent,
      principal: DEMO_WALLETS.principal,
      totalCap: '100,000',
      singleMax: '5,000',
      spent: '0',
      active: true,
    };
    setMandates(prev => [...prev, m]);
  }, [mandates.length]);

  const simulatePayment = useCallback(async (
    recipientKey: 'recipient' | 'unverified',
    tokenKey: keyof typeof TOKENS,
    amount: string
  ) => {
    setProcessing(true);
    const log: string[] = [];
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

    const push = (msg: string) => { log.push(msg); setGateLog([...log]); };

    await sleep(400);
    push(`[Gate 0] Caller check — agent ${DEMO_WALLETS.agent} is authorized`);
    await sleep(500);
    push(`[Gate 1] Mandate #${getNextId()} — active`);
    await sleep(600);

    if (recipientKey === 'unverified') {
      push(`[Gate 2] CVI identity — ${DEMO_WALLETS.unverified} NOT verified`);
      await sleep(300);
      push(`DENIED: CVI: recipient not verified`);
      setAudit(prev => [...prev, {
        id: prev.length + 1, mandateId: getNextId(), agent: DEMO_WALLETS.agent,
        recipient: DEMO_WALLETS.unverified, token: TOKENS[tokenKey].addr,
        amount, approved: false, reason: 'CVI: recipient not verified',
        timestamp: Date.now(),
      }]);
      setProcessing(false);
      return;
    }
    push(`[Gate 2] CVI identity — ${DEMO_WALLETS.recipient} verified`);

    await sleep(500);
    if (!TOKENS[tokenKey].verified) {
      push(`[Gate 3] CVA asset — ${TOKENS[tokenKey].name} NOT verified`);
      await sleep(300);
      push(`DENIED: CVA: token not verified`);
      setAudit(prev => [...prev, {
        id: prev.length + 1, mandateId: getNextId(), agent: DEMO_WALLETS.agent,
        recipient: DEMO_WALLETS.recipient, token: TOKENS[tokenKey].addr,
        amount, approved: false, reason: 'CVA: token not verified',
        timestamp: Date.now(),
      }]);
      setProcessing(false);
      return;
    }
    push(`[Gate 3] CVA asset — ${TOKENS[tokenKey].name} verified, clean origination`);

    await sleep(400);
    push(`[Gate 4] CVA compliance — ${amount} passes screening`);
    await sleep(400);
    push(`[Gate 5] Single-transaction limit — ${amount} within 5,000 cap`);
    await sleep(400);
    push(`[Gate 6] Cumulative cap — within 100,000 mandate total`);
    await sleep(300);
    push(`TRANSFER COMPLETE`);

    setAudit(prev => [...prev, {
      id: prev.length + 1, mandateId: getNextId(), agent: DEMO_WALLETS.agent,
      recipient: DEMO_WALLETS.recipient, token: TOKENS[tokenKey].addr,
      amount, approved: true, reason: '', timestamp: Date.now(),
    }]);
    setProcessing(false);
  }, [mandates.length]);

  return (
    <div className="relative z-10 min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-[#0a0a0b]/80 border-b border-[#1f1f23]">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="mono text-sm font-semibold tracking-widest text-[#eeeef0]">SPENDCLEAR</span>
          <div className="flex gap-6 text-xs text-[#8b8b96]">
            <a href="#demo" className="hover:text-[#eeeef0] transition-colors">Demo</a>
            <a href="#contracts" className="hover:text-[#eeeef0] transition-colors">Contracts</a>
            <a href="#audit" className="hover:text-[#eeeef0] transition-colors">Audit Trail</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-32 pb-20">
        <div className="flex gap-2 mb-6">
          <span className="mono text-[11px] tracking-wider px-3 py-1 rounded-full border border-[#22c55e33] text-[#22c55e] bg-[#22c55e12]">CVI</span>
          <span className="mono text-[11px] tracking-wider px-3 py-1 rounded-full border border-[#3b82f633] text-[#3b82f6] bg-[#3b82f612]">CVA</span>
          <span className="mono text-[11px] tracking-wider px-3 py-1 rounded-full border border-[#f59e0b33] text-[#f59e0b] bg-[#f59e0b12]">MONAD</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-[#eeeef0] leading-[0.95]">
          Verified agent<br />payments.<br />On-chain.
        </h1>
        <p className="mt-6 text-lg text-[#8b8b96] max-w-xl">
          Clean money. Clean identity. On-chain audit trail.<br />
          Built for autonomous agents on <span className="text-[#eeeef0]">Monad</span>.
        </p>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <h2 className="mono text-xs tracking-widest text-[#2a2a30] mb-6">SIX DENY-FIRST GATES</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { n: '01', t: 'Agent Auth', d: 'Caller matches the authorized agent address' },
            { n: '02', t: 'Mandate Active', d: 'Mandate has not been revoked by principal' },
            { n: '03', t: 'CVI Identity', d: 'Recipient wallet holds a valid CVI identity token' },
            { n: '04', t: 'CVA Asset', d: 'Stablecoin has clean origination and full traceability' },
            { n: '05', t: 'CVA Compliance', d: 'Transfer amount passes compliance screening' },
            { n: '06', t: 'Spend Limits', d: 'Within single-tx max and cumulative mandate cap' },
          ].map(g => (
            <div key={g.n} className="border border-[#1f1f23] rounded-xl p-5 bg-[#141416]">
              <span className="mono text-xs text-[#2a2a30]">{g.n}</span>
              <div className="text-[#eeeef0] font-semibold mt-1">{g.t}</div>
              <div className="text-sm text-[#8b8b96] mt-1">{g.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Interactive Demo */}
      <section id="demo" className="max-w-6xl mx-auto px-6 pb-20">
        <h2 className="mono text-xs tracking-widest text-[#2a2a30] mb-6">LIVE DEMO</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Controls */}
          <div className="border border-[#1f1f23] rounded-xl p-6 bg-[#141416] space-y-5">
            <div>
              <label className="mono text-xs text-[#8b8b96] block mb-2">STEP 1 — CREATE MANDATE</label>
              <button
                onClick={addMandate}
                disabled={mandates.length > 0}
                className="w-full py-3 rounded-lg bg-[#22c55e] text-black font-semibold text-sm disabled:opacity-30 hover:opacity-90 transition-opacity"
              >
                {mandates.length ? 'Mandate Active' : 'Create Mandate'}
              </button>
            </div>

            <div className="space-y-3">
              <label className="mono text-xs text-[#8b8b96] block">STEP 2 — SIMULATE PAYMENT</label>
              <select id="recipient-sel" className="w-full bg-[#0a0a0b] border border-[#1f1f23] rounded-lg px-4 py-2.5 text-sm text-[#eeeef0]">
                <option value="recipient">CVI-Verified Recipient</option>
                <option value="unverified">Unverified Wallet (should deny)</option>
              </select>
              <select id="token-sel" className="w-full bg-[#0a0a0b] border border-[#1f1f23] rounded-lg px-4 py-2.5 text-sm text-[#eeeef0]">
                <option value="USDC_CVA">CVA-USDC (verified)</option>
                <option value="USDT_CVA">CVA-USDT (verified)</option>
                <option value="RANDOM">UNV-TOKEN (not verified)</option>
              </select>
              <input
                id="amount-input"
                type="text"
                defaultValue="2,500"
                className="w-full bg-[#0a0a0b] border border-[#1f1f23] rounded-lg px-4 py-2.5 text-sm text-[#eeeef0] mono"
                placeholder="Amount"
              />
              <button
                onClick={() => {
                  const r = (document.getElementById('recipient-sel') as HTMLSelectElement).value as 'recipient' | 'unverified';
                  const t = (document.getElementById('token-sel') as HTMLSelectElement).value as keyof typeof TOKENS;
                  const a = (document.getElementById('amount-input') as HTMLInputElement).value;
                  if (mandates.length === 0) return;
                  simulatePayment(r, t, a);
                }}
                disabled={mandates.length === 0 || processing}
                className="w-full py-3 rounded-lg bg-[#3b82f6] text-white font-semibold text-sm disabled:opacity-30 hover:opacity-90 transition-opacity"
              >
                {processing ? 'Processing Gates...' : 'Execute Payment'}
              </button>
            </div>
          </div>

          {/* Gate Log */}
          <div className="border border-[#1f1f23] rounded-xl p-6 bg-[#141416]">
            <div className="mono text-xs text-[#8b8b96] mb-3">GATE EVALUATION</div>
            <div className="space-y-2 min-h-[200px] max-h-[360px] overflow-y-auto">
              {gateLog.length === 0 && (
                <div className="text-sm text-[#2a2a30]">Create a mandate, then execute a payment...</div>
              )}
              {gateLog.map((line, i) => {
                const isDeny = line.startsWith('DENIED');
                const isPass = line.startsWith('TRANSFER');
                const isGate = line.startsWith('[Gate');
                return (
                  <div
                    key={i}
                    className={`audit-entry mono text-xs px-3 py-2 rounded-lg ${
                      isDeny ? 'bg-[#ef444412] text-[#ef4444] border border-[#ef444433]' :
                      isPass ? 'bg-[#22c55e12] text-[#22c55e] border border-[#22c55e33]' :
                      isGate ? 'bg-[#141416] text-[#8b8b96]' :
                      'text-[#8b8b96]'
                    }`}
                  >
                    {line}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Contracts */}
      <section id="contracts" className="max-w-6xl mx-auto px-6 pb-20">
        <h2 className="mono text-xs tracking-widest text-[#2a2a30] mb-6">CONTRACTS</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { name: 'SpendClear', desc: 'Core governor with 6 gates', highlight: true },
            { name: 'ICVI', desc: 'Verified Identity interface' },
            { name: 'ICVA', desc: 'Verified Assets interface' },
            { name: 'Mocks', desc: 'Test implementations' },
          ].map(c => (
            <div key={c.name} className={`border rounded-xl p-5 ${c.highlight ? 'border-[#22c55e33] bg-[#22c55e08]' : 'border-[#1f1f23] bg-[#141416]'}`}>
              <div className={`mono text-sm font-semibold ${c.highlight ? 'text-[#22c55e]' : 'text-[#eeeef0]'}`}>{c.name}</div>
              <div className="text-xs text-[#8b8b96] mt-1">{c.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Audit Trail */}
      <section id="audit" className="max-w-6xl mx-auto px-6 pb-20">
        <h2 className="mono text-xs tracking-widest text-[#2a2a30] mb-6">IMMUTABLE AUDIT TRAIL</h2>
        <div className="border border-[#1f1f23] rounded-xl overflow-hidden bg-[#141416]">
          <table className="w-full text-xs mono">
            <thead>
              <tr className="border-b border-[#1f1f23] text-[#2a2a30]">
                <th className="text-left px-4 py-3 font-medium">#</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Token</th>
                <th className="text-left px-4 py-3 font-medium">Amount</th>
                <th className="text-left px-4 py-3 font-medium">Recipient</th>
                <th className="text-left px-4 py-3 font-medium">Reason</th>
              </tr>
            </thead>
            <tbody>
              {audit.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-[#2a2a30]">No payments yet</td></tr>
              )}
              {[...audit].reverse().map(e => (
                <tr key={e.id} className="border-b border-[#1f1f23] last:border-0">
                  <td className="px-4 py-3 text-[#8b8b96]">{e.id}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      e.approved ? 'bg-[#22c55e12] text-[#22c55e]' : 'bg-[#ef444412] text-[#ef4444]'
                    }`}>
                      {e.approved ? 'APPROVED' : 'DENIED'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#8b8b96]">{e.token}</td>
                  <td className="px-4 py-3 text-[#eeeef0]">{e.amount}</td>
                  <td className="px-4 py-3 text-[#8b8b96]">{e.recipient}</td>
                  <td className={`px-4 py-3 ${e.reason ? 'text-[#ef4444]' : 'text-[#2a2a30]'}`}>{e.reason || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1f1f23] mt-10">
        <div className="max-w-6xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <div className="mono text-sm font-semibold text-[#eeeef0] tracking-wider">SPENDCLEAR</div>
            <div className="text-xs text-[#2a2a30] mt-1">Cleanverse Build Hackathon &middot; Monad Testnet &middot; MIT</div>
          </div>
          <div className="flex gap-6 text-xs text-[#8b8b96]">
            <a href="https://github.com/icohangar-ops/spendclear" target="_blank" className="hover:text-[#eeeef0]">GitHub</a>
            <a href="https://testnet.monadexplorer.com" target="_blank" className="hover:text-[#eeeef0]">Monad Explorer</a>
            <a href="https://cleanverse.com" target="_blank" className="hover:text-[#eeeef0]">Cleanverse</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
