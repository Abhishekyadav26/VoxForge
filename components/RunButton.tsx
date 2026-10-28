"use client";
import { useState } from "react";
import { Play } from "@/components/icons";
import { Button } from "@/components/ui/button";
export default function RunButton({ agentId }: { agentId: string }) {
  const [state, setState] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function runNow() {
    setLoading(true); setError(null); setState(null);
    try {
      const res = await fetch("/api/run-agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ agentId, dryRun: true }) });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setState(json.data);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }
  return (<div className="space-y-2">
    <Button size="sm" onClick={runNow} disabled={loading}><Play />{loading ? "Running…" : "Run now (dry)"}</Button>
    {error && <p className="text-sm text-slate-300">{error}</p>}
    {state && <p className={"text-sm " + (state.triggered ? "text-slate-200" : "text-slate-400")}>{state.triggered ? "Triggered — alert sent" : "No trigger — conditions not met"}</p>}
  </div>);
}
