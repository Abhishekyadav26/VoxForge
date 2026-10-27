"use client";
import { useState } from "react";
import { NumberTicker } from "@/components/ui/number-ticker";
import type { AgentSpec } from "@/lib/spec-schema";

interface TraceLine { stepId: string; block: string; detail: string; output: Record<string, unknown>; }

/** Dry-run the spec server-side; shows a step-by-step trace. */
export default function TestResults({ spec }: { spec: AgentSpec }) {
  const [state, setState] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function dryRun() {
    setLoading(true); setError(null); setState(null);
    try {
      const res = await fetch("/api/test-spec", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ spec }) });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setState(json.data);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }
  return (<section className="space-y-2">
    <h2 className="text-lg font-semibold">Dry Run</h2>
    <button onClick={dryRun} disabled={loading} className="rounded bg-slate-700 px-4 py-2 text-sm font-semibold disabled:opacity-50">{loading ? "Running…" : "▶ Run trace"}</button>
    {error && <p className="text-sm text-red-400">{error}</p>}
    {state?.trace && (() => {
      const priceOut = state.trace.map((t: any) => t.output).find((o: any) => o && typeof o.price === "number");
      const balOut = state.trace.map((t: any) => t.output).find((o: any) => o && typeof o.balance === "number");
      return (<>
        {priceOut && (
          <div className="flex items-baseline gap-3 rounded border border-slate-700 bg-slate-900 p-4">
            <span className="text-4xl font-bold tracking-tight text-emerald-400">
              $<NumberTicker value={priceOut.price} decimalPlaces={2} />
            </span>
            <span className="text-sm text-slate-400">live dry-run price (CoinMarketCap)</span>
          </div>
        )}
        {balOut && (
          <div className="flex items-baseline gap-3 rounded border border-slate-700 bg-slate-900 p-4">
            <span className="text-4xl font-bold tracking-tight text-emerald-400">
              <NumberTicker value={balOut.balance} decimalPlaces={4} />
            </span>
            <span className="text-sm text-slate-400">SOL wallet balance (Solana RPC)</span>
          </div>
        )}
      </>);
    })()}
    {state?.trace && (<ol className="space-y-1 rounded border border-slate-700 bg-slate-900 p-3 text-sm">
      {state.trace.map((t: TraceLine, i: number) => (<li key={i} className="text-slate-300"><span className="font-mono text-emerald-400">{t.stepId}</span> · {t.detail}</li>))}
    </ol>)}
    {state?.triggered !== undefined && (<p className={"text-sm font-semibold " + (state.triggered ? "text-emerald-400" : "text-slate-400")}>{state.triggered ? "🔔 Conditions met — alert would fire" : "✅ Conditions not met — no alert"}</p>)}
    {state?.messages?.length > 0 && state.messages.map((m: string, i: number) => <div key={i} className="rounded border border-emerald-700 bg-emerald-950/40 p-2 text-sm">{m}<div className="mt-1 text-xs text-slate-400">(dry-run — not sent)</div></div>)}
    {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
  </section>);
}
