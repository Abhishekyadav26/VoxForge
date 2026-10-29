import { AgentSpec } from "./spec-schema";
import { getPrice } from "./blocks/price";
import { getBalance } from "./blocks/wallet";
import { getFearGreed, getGlobalMetrics, formatUsd } from "./blocks/market";
import { compare, percentChangeCheck, CompareOp } from "./blocks/condition";
import { renderMessage, sendTelegram } from "./blocks/notify";

/**
 * Pick the real percent change from a step output (price.get carries
 * percentChange1h/24h/7d from CMC) that matches the requested time window.
 * Returns undefined when the output has no real change data (e.g. balances).
 */
function realPercentChange(
  ref: string,
  outputs: Record<string, Record<string, unknown>>,
  timeWindow: string
): number | undefined {
  const [sid] = ref.split(".");
  const out = outputs[sid] ?? {};
  const w = timeWindow.toLowerCase();
  if (/^(5m|60s|1h)/.test(w)) return typeof out.percentChange1h === "number" ? (out.percentChange1h as number) : undefined;
  if (/^24h/.test(w)) return typeof out.percentChange24h === "number" ? (out.percentChange24h as number) : undefined;
  if (/^7d/.test(w)) return typeof out.percentChange7d === "number" ? (out.percentChange7d as number) : undefined;
  return undefined;
}

export interface TraceLine {
  stepId: string;
  block: string;
  detail: string;
  output: Record<string, unknown>;
}

export interface RunResult {
  success: boolean;
  triggered: boolean;
  trace: TraceLine[];
  messages: string[];
  error?: string;
}

function getRef(ref: string, outputs: Record<string, Record<string, unknown>>): number {
  // ref like "s1.price"
  const [sid, field] = ref.split(".");
  const v = outputs[sid]?.[field];
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n)) throw new Error(`Cannot resolve numeric ref "${ref}"`);
  return n;
}

/**
 * Execute a spec. dryRun=true mocks external calls where possible
 * and never sends real Telegram messages.
 */
export async function runSpec(
  spec: AgentSpec,
  opts?: { dryRun?: boolean; mockActualChange?: number }
): Promise<RunResult> {
  const dryRun = opts?.dryRun ?? false;
  const outputs: Record<string, Record<string, unknown>> = {};
  const trace: TraceLine[] = [];

  try {
    for (const step of spec.steps) {
      const p = step.params as Record<string, any>;
      switch (step.block) {
        case "price.get": {
          const r = await getPrice(String(p.token ?? "SOL"), String(p.currency ?? "USD"));
          outputs[step.id] = r as unknown as Record<string, unknown>;
          trace.push({
            stepId: step.id, block: step.block,
            detail: `${p.token} price = $${r.price}`,
            output: outputs[step.id],
          });
          break;
        }
        case "wallet.getBalance": {
          if (String(p.address) === "MISSING_WALLET_ADDRESS") {
            throw new Error(`Step ${step.id}: wallet address is missing. Ask the user to paste it.`);
          }
          const r = await getBalance(String(p.chain ?? "solana"), String(p.address));
          outputs[step.id] = r as Record<string, unknown>;
          trace.push({
            stepId: step.id, block: step.block,
            detail: `Wallet balance = ${r.formatted}`,
            output: outputs[step.id],
          });
          break;
        }
        case "market.fearGreed": {
          const r = await getFearGreed();
          outputs[step.id] = r as unknown as Record<string, unknown>;
          trace.push({
            stepId: step.id, block: step.block,
            detail: `Fear & Greed = ${r.value} (${r.classification})`,
            output: outputs[step.id],
          });
          break;
        }
        case "market.globalMetrics": {
          const r = await getGlobalMetrics(String(p.currency ?? "USD"));
          outputs[step.id] = r as unknown as Record<string, unknown>;
          trace.push({
            stepId: step.id, block: step.block,
            detail: `Total market cap ${formatUsd(r.totalMarketCap)} · BTC dom ${r.btcDominance.toFixed(1)}% · ETH dom ${r.ethDominance.toFixed(1)}%`,
            output: outputs[step.id],
          });
          break;
        }
        case "condition.compare": {
          const left = getRef(String(p.left), outputs);
          const r = compare(left, p.op as CompareOp, Number(p.right));
          outputs[step.id] = r as Record<string, unknown>;
          trace.push({
            stepId: step.id, block: step.block,
            detail: `${p.left} (${left}) ${p.op} ${p.right}? ${r.result ? "YES" : "NO"}`,
            output: outputs[step.id],
          });
          break;
        }
        case "condition.percentChange": {
          const cur = getRef(String(p.value), outputs);
          const window = String(p.timeWindow ?? "1h");
          // Prefer the real change from CMC (live run); fall back to the
          // provided mock so dry-runs without a key still behave deterministically.
          const actual =
            realPercentChange(String(p.value), outputs, window) ?? opts?.mockActualChange;
          const r = percentChangeCheck(cur, Number(p.percentChange), window, actual);
          outputs[step.id] = r as Record<string, unknown>;
          trace.push({
            stepId: step.id, block: step.block,
            detail: `${p.value} changed ${r.actualChange}% vs threshold ${p.percentChange}% (${window})? ${r.result ? "YES" : "NO"}`,
            output: outputs[step.id],
          });
          break;
        }
        default:
          throw new Error(`Unknown block "${step.block}"`);
      }
    }

    // All conditions must be true to trigger (AND semantics).
    const conditions = spec.steps.filter((s) => s.block.startsWith("condition."));
    const triggered =
      conditions.length === 0 ||
      conditions.every((s) => outputs[s.id]?.result === true);

    const messages: string[] = [];
    if (triggered) {
      for (const a of spec.actions) {
        const msg = renderMessage(a.params.message, outputs);
        messages.push(msg);
        await sendTelegram(msg, { dryRun });
      }
    }
    return { success: true, triggered, trace, messages };
  } catch (e: any) {
    return {
      success: false, triggered: false, trace,
      messages: [], error: e?.message ?? String(e),
    };
  }
}
