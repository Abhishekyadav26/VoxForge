"use client";
import { useState } from "react";
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
    <button onClick={runNow} disabled={loading} className="rounded bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">{loading ? "Running…" : "▶ Run now (dry)"}</button>
    {error && <p className="text-sm text-red-400">{error}</p>}
    {state && <p className={"text-sm " + (state.triggered ? "text-emerald-400" : "text-slate-400")}>{state.triggered ? "🔔 Triggered — alert sent" : "No trigger — conditions not met"}</p>}
  </div>);
}
