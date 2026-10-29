"use client";
import { forwardRef, useImperativeHandle, useState } from "react";
import { NumberTicker } from "@/components/ui/number-ticker";
import { TokenStatCard } from "@/components/TokenStatCard";
import AgentRunView from "@/components/AgentRunView";
import { Play } from "@/components/icons";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import type { AgentSpec } from "@/lib/spec-schema";

function formatMarket(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toFixed(0)}`;
}

interface TraceLine { stepId: string; block: string; detail: string; output: Record<string, unknown>; }

export interface TestResultsHandle {
  run: () => void;
}

/** Dry-run the spec server-side; shows a step-by-step trace. */
const TestResults = forwardRef<TestResultsHandle, { spec: AgentSpec }>(
  function TestResults({ spec }, ref) {
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
        toast.success(json.data.triggered ? "Conditions met — alert would fire" : "No trigger — conditions not met");
      } catch (e: any) { setError(e.message); toast.error(e.message); } finally { setLoading(false); }
    }
    useImperativeHandle(ref, () => ({ run: () => void dryRun() }));
  return (<section className="space-y-2">
    <h2 className="text-lg font-semibold">Dry Run</h2>
    <Button size="sm" variant="secondary" onClick={dryRun} disabled={loading}><Play />{loading ? "Running…" : "Run trace"}</Button>
    {error && <p className="text-sm text-slate-300">{error}</p>}
    {state?.trace && (() => {
      const priceStep = (state.trace as any[]).find((t: any) => t.output && typeof t.output.price === "number");
      const balStep = (state.trace as any[]).find((t: any) => t.output && typeof t.output.balance === "number");
      const fgStep = (state.trace as any[]).find((t: any) => t.block === "market.fearGreed" && t.output && typeof t.output.value === "number");
      const gmStep = (state.trace as any[]).find((t: any) => t.block === "market.globalMetrics" && t.output && typeof t.output.totalMarketCap === "number");
      const priceOut = priceStep?.output;
      const balOut = balStep?.output;
      // Which token are we pricing? (from the price.get step params)
      const priceParams = (spec.steps.find((s: any) => s.block === "price.get")?.params ?? {}) as Record<string, any>;
      const ticker = String(priceParams.token ?? "SOL");
      const pctStep = (state.trace as any[]).find((t: any) => typeof t.output?.actualChange === "number");
      const pct: number | undefined = pctStep?.output?.actualChange;
      return (<>
        {fgStep?.output && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full text-lg" style={{ background: (fgStep.output as any).value < 40 ? "#7f1d1d" : (fgStep.output as any).value > 60 ? "#14532d" : "#1e3a8a", color: "#fff" }}>
              {(fgStep.output as any).value}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">Fear &amp; Greed: {(fgStep.output as any).classification}</p>
              <p className="text-xs text-slate-400">CMC Crypto Fear &amp; Greed index (0–100)</p>
            </div>
          </div>
        )}
        {gmStep?.output && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm">
            <p className="text-sm font-semibold text-slate-200">Global market</p>
            <div className="mt-1 flex flex-wrap gap-x-6 gap-y-1 text-slate-300">
              <span>Market cap: <strong className="text-slate-100">${formatMarket((gmStep.output as any).totalMarketCap)}</strong></span>
              <span>24h volume: <strong className="text-slate-100">${formatMarket((gmStep.output as any).totalVolume24h)}</strong></span>
              <span>BTC dom: <strong className="text-slate-100">{(gmStep.output as any).btcDominance.toFixed(1)}%</strong></span>
              <span>ETH dom: <strong className="text-slate-100">{(gmStep.output as any).ethDominance.toFixed(1)}%</strong></span>
            </div>
          </div>
        )}
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
    {state?.trace && (
      <AgentRunView
        transcript={spec.name}
        trace={(state.trace as TraceLine[]).map((t) => ({ stepId: t.stepId, block: t.block, detail: t.detail, output: t.output ?? {} }))}
        triggered={!!state.triggered}
        messages={state.messages}
        error={state.error}
      />
    )}
    {state?.triggered !== undefined && (<p className={"text-sm font-semibold " + (state.triggered ? "text-slate-200" : "text-slate-400")}>{state.triggered ? "Conditions met — alert would fire" : "✓ Conditions not met — no alert"}</p>)}
    {state?.messages?.length > 0 && state.messages.map((m: string, i: number) => <div key={i} className="rounded border border-slate-600 bg-slate-900/60 p-2 text-sm">{m}<div className="mt-1 text-xs text-slate-400">(dry-run — not sent)</div></div>)}
    {state?.error && <p className="text-sm text-slate-300">{state.error}</p>}
  </section>);
  }
);

export default TestResults;
