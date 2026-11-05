"use client";

import type { AgentSpec } from "@/lib/spec-schema";
import { fmtDate } from "@/lib/format-date";

export { fmtDate };

/** Plain-language summary of one step (no block-name jargon). */
function stepText(s: AgentSpec["steps"][number]): string {
  const p = s.params as Record<string, any>;
  switch (s.block) {
    case "price.get":
      return `Watch ${p.token ?? "?"} price (${p.currency ?? "USD"})`;
    case "wallet.getBalance":
      return `Watch wallet balance (${p.chain ?? "solana"})`;
    case "market.fearGreed":
      return "Watch the Fear & Greed index";
    case "market.globalMetrics":
      return `Watch global market metrics (${p.currency ?? "USD"})`;
    case "market.coinInfo":
      return `Look up ${p.token ?? "token"} info`;
    case "market.narrative":
      return "Watch hot market narratives";
    case "price.historical":
      return `Compare with price ${p.hoursAgo ?? 24}h ago`;
    case "condition.compare": {
      // Plain words: "Alert when price drops below $150" not "price < 150".
      const field = String(p.left ?? "?").replace(/^s\d+\./, "");
      const opWord = { "<": "drops below", ">": "rises above", "<=": "is at or below", ">=": "is at or above", "==": "equals" }[String(p.op)] ?? String(p.op ?? "?");
      return `Alert when ${field} ${opWord} ${p.right ?? "?"}`;
    }
    case "condition.percentChange":
      return `Alert on ${Number(p.percentChange) < 0 ? "drop" : "move"} of ${p.percentChange}% (${p.timeWindow ?? "1h"})`;
    default:
      return s.id;
  }
}

/**
 * Human-first spec summary: trigger cadence + what it watches + the alert.
 * Raw JSON stays available in a collapsed Developer block (see detail page).
 */
export default function SpecSummary({ spec }: { spec: AgentSpec }) {
  const cadence =
    spec.trigger.type === "interval" && spec.trigger.every
      ? `Checked every ${spec.trigger.every.replace(/^(\d+)s$/, "$1 seconds").replace(/^(\d+)m$/, "$1 minutes").replace(/^(\d+)h$/, "$1 hours")}`
      : "Runs on demand";
  const conditions = spec.steps.filter((s) => s.block.startsWith("condition."));
  const watches = spec.steps.filter((s) => !s.block.startsWith("condition."));
  return (
    <div className="space-y-2 rounded border border-slate-700 bg-slate-900 p-4 text-sm">
      <p className="break-words font-semibold text-slate-100">{spec.name}</p>
      <p className="text-xs text-slate-400">{cadence}</p>
      <ul className="space-y-1 text-slate-200">
        {watches.map((s) => (
          <li key={s.id} className="flex gap-2">
            <span aria-hidden className="text-slate-400">·</span>
            <span>{stepText(s)}</span>
          </li>
        ))}
        {conditions.map((s) => (
          <li key={s.id} className="flex gap-2 font-medium text-emerald-200">
            <span aria-hidden>→</span>
            <span>{stepText(s)}</span>
          </li>
        ))}
      </ul>
      {spec.actions.map((a, i) => (
        <p key={i} className="text-xs text-slate-400">
          ✉️ Sends a Telegram alert when all conditions hold.
        </p>
      ))}
    </div>
  );
}
