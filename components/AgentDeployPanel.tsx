"use client";
import { useState } from "react";
import { Link } from "next-view-transitions";
import type { AgentSpec } from "@/lib/spec-schema";

interface Props { spec: AgentSpec; onSpecChange: (s: AgentSpec) => void; }

/** Fill missing fields, then save the agent. */
export default function AgentDeployPanel({ spec, onSpecChange }: Props) {
  const [result, setResult] = useState<{ id: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const missing = spec.missingFields ?? [];
  const needsAddress = missing.includes("wallet_address");
  const addrStep = spec.steps.find((s) => s.block === "wallet.getBalance" && (s.params as any).address === "MISSING_WALLET_ADDRESS");

  async function deploy() {
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch("/api/deploy-agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ spec }) });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setResult(json.data);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }
  function setAddress(v: string) {
    if (!addrStep) return;
    onSpecChange({ ...spec, steps: spec.steps.map((s) => s.id === addrStep.id ? { ...s, params: { ...(s.params as any), address: v } } : s), missingFields: missing.filter((f) => f !== "wallet_address") });
  }
  return (<section className="space-y-2 rounded border border-slate-700 p-4">
    <h2 className="text-lg font-semibold">Deploy</h2>
    {missing.length > 0 && (<div className="flex flex-wrap gap-2">{missing.map((f) => <span key={f} className="rounded bg-slate-500/20 px-2 py-1 text-xs text-slate-200">{f}</span>)}</div>)}
    {needsAddress && addrStep && (<div><label className="mb-1 block text-xs text-slate-400">Solana wallet address (required)</label><input value={(addrStep.params as any).address === "MISSING_WALLET_ADDRESS" ? "" : (addrStep.params as any).address} onChange={(e) => setAddress(e.target.value)} placeholder="Paste your Solana address…" className="w-full rounded border border-slate-500 bg-slate-900 p-2 text-sm outline-none focus:border-slate-300" /></div>)}
    <button onClick={deploy} disabled={loading} className="rounded bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">{loading ? "Deploying…" : "Deploy agent"}</button>
    {error && <p className="text-sm text-slate-300">{error}</p>}
    {result && (<p className="text-sm text-slate-200">Deployed! <Link href={"/agents/" + result.id} className="underline">View agent →</Link></p>)}
  </section>);
}
