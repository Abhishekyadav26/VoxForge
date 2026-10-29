"use client";
import { forwardRef, useImperativeHandle, useState } from "react";
import { Link } from "next-view-transitions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";
import type { AgentSpec } from "@/lib/spec-schema";

interface Props { spec: AgentSpec; onSpecChange: (s: AgentSpec) => void; }

export interface AgentDeployHandle {
  deploy: () => void;
}

/** Fill missing fields, then save the agent. */
const AgentDeployPanel = forwardRef<AgentDeployHandle, Props>(
  function AgentDeployPanel({ spec, onSpecChange }, ref) {
    const [result, setResult] = useState<{ id: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

  const missing = spec.missingFields ?? [];
  const needsAddress = missing.includes("wallet_address");
  const addrStep = spec.steps.find((s) => s.block === "wallet.getBalance" && (s.params as any).address === "MISSING_WALLET_ADDRESS");

  async function deploy() {
    if (needsAddress && addrStep && (addrStep.params as any).address === "MISSING_WALLET_ADDRESS") {
      toast.error("Add your Solana wallet address first");
      return;
    }
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch("/api/deploy-agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ spec }) });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setResult(json.data);
      toast.success("Agent deployed");
    } catch (e: any) { setError(e.message); toast.error(e.message); } finally { setLoading(false); }
  }
  useImperativeHandle(ref, () => ({ deploy: () => void deploy() }));
  function setAddress(v: string) {
    if (!addrStep) return;
    onSpecChange({ ...spec, steps: spec.steps.map((s) => s.id === addrStep.id ? { ...s, params: { ...(s.params as any), address: v } } : s), missingFields: missing.filter((f) => f !== "wallet_address") });
  }
  return (<section className="space-y-2 rounded border border-slate-700 p-4">
    <h2 className="text-lg font-semibold">Deploy</h2>
    {missing.length > 0 && (<div className="flex flex-wrap gap-2">{missing.map((f) => <Badge key={f} variant="secondary">{f}</Badge>)}</div>)}
    {needsAddress && addrStep && (<div className="space-y-1"><Label className="text-xs text-slate-400">Solana wallet address (required)</Label><Input value={(addrStep.params as any).address === "MISSING_WALLET_ADDRESS" ? "" : (addrStep.params as any).address} onChange={(e) => setAddress(e.target.value)} placeholder="Paste your Solana address…" className="bg-slate-800" /></div>)}
    <Button onClick={deploy} disabled={loading}>{loading ? "Deploying…" : "Deploy agent"}</Button>
    {error && <p className="text-sm text-slate-300">{error}</p>}
    {result && (<p className="text-sm text-slate-200">Deployed! <Link href={"/agents/" + result.id} className="underline">View agent →</Link></p>)}
  </section>);
  }
);

export default AgentDeployPanel;
