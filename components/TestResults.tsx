"use client";
import { useState } from "react";
import { NumberTicker } from "@/components/ui/number-ticker";
import { TokenStatCard } from "@/components/TokenStatCard";
import { Play } from "@/components/icons";
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
    <button onClick={dryRun} disabled={loading} className="inline-flex items-center gap-1.5 rounded bg-slate-700 px-4 py-2 text-sm font-semibold disabled:opacity-50"><Play size={13} />{loading ? "Running…" : "Run trace"}</button>
    {error && <p className="text-sm text-slate-300">{error}</p>}
    {state?.trace && (() => {
      const priceStep = (state.trace as any[]).find((t: any) => t.output && typeof t.output.price === "number");
      const balStep = (state.trace as any[]).find((t: any) => t.output && typeof t.output.balance === "number");
      const priceOut = priceStep?.output;
      const balOut = balStep?.output;
      // Which token are we pricing? (from the price.get step params)
      const priceParams = (spec.steps.find((s: any) => s.block === "price.get")?.params ?? {}) as Record<string, any>;
      const ticker = String(priceParams.token ?? "SOL");
      const pctStep = (state.trace as any[]).find((t: any) => typeof t.output?.actualChange === "number");
      const pct: number | undefined = pctStep?.output?.actualChange;
      return (<>
        {priceOut && (
          <TokenStatCard
            ticker={ticker}
            name=""
            currentPrice={priceOut.price}
            percentageChange={pct}
            triggered={!!state.triggered}
          >
            <span className="flex items-baseline gap-2 text-sm text-slate-400">
              Live dry-run price:
              <span className="text-2xl font-bold tracking-tight text-slate-100">
                $<NumberTicker value={priceOut.price} decimalPlaces={2} />
              </span>
            </span>
          </TokenStatCard>
        )}
        {balOut && (
          <TokenStatCard
            ticker="SOL"
            name=""
            currentPrice={balOut.balance}
            percentageChange={pct}
            triggered={!!state.triggered}
          >
            <span className="flex items-baseline gap-2 text-sm text-slate-400">
              Wallet balance:
              <span className="text-2xl font-bold tracking-tight text-slate-100">
                <NumberTicker value={balOut.balance} decimalPlaces={4} /> SOL
              </span>
            </span>
          </TokenStatCard>
        )}
      </>);
    })()}
    {state?.trace && (<ol className="space-y-1 rounded border border-slate-700 bg-slate-900 p-3 text-sm">
      {state.trace.map((t: TraceLine, i: number) => (<li key={i} className="text-slate-300"><span className="font-mono text-slate-100">{t.stepId}</span> · {t.detail}</li>))}
    </ol>)}
    {state?.triggered !== undefined && (<p className={"text-sm font-semibold " + (state.triggered ? "text-slate-200" : "text-slate-400")}>{state.triggered ? "Conditions met — alert would fire" : "✓ Conditions not met — no alert"}</p>)}
    {state?.messages?.length > 0 && state.messages.map((m: string, i: number) => <div key={i} className="rounded border border-slate-600 bg-slate-900/60 p-2 text-sm">{m}<div className="mt-1 text-xs text-slate-400">(dry-run — not sent)</div></div>)}
    {state?.error && <p className="text-sm text-slate-300">{state.error}</p>}
  </section>);
}
