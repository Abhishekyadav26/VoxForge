"use client";

import * as React from "react";
import {
  AgentWorkflow,
  type AgentPhase,
  type ToolDefinition,
  type TraceNode,
} from "@/components/ui/ai-agent-response";
import { TrendingUp, GitCompare, Send, Wallet, Gauge, Layers, Bell } from "lucide-react";

/* ─────────────────────────────────────────────────────────
 * VoxForge tool registry: real monitor blocks, styled like the
 * component's default registry but mapped to the engine's blocks.
 * ───────────────────────────────────────────────────────── */
export const VF_TOOLS: Record<string, ToolDefinition> = {
  "price.get": {
    name: "price.get",
    label: "Live price",
    icon: TrendingUp,
    iconClassName: "text-sky-500",
  },
  "condition.compare": {
    name: "condition.compare",
    label: "Check condition",
    icon: GitCompare,
    iconClassName: "text-emerald-500",
  },
  "condition.percentChange": {
    name: "condition.percentChange",
    label: "Percent change",
    icon: GitCompare,
    iconClassName: "text-emerald-500",
  },
  "wallet.getBalance": {
    name: "wallet.getBalance",
    label: "Wallet balance",
    icon: Wallet,
    iconClassName: "text-amber-500",
    monoChip: true,
  },
  "market.fearGreed": {
    name: "market.fearGreed",
    label: "Fear & Greed",
    icon: Gauge,
    iconClassName: "text-rose-500",
  },
  "market.globalMetrics": {
    name: "market.globalMetrics",
    label: "Global metrics",
    icon: Layers,
    iconClassName: "text-violet-500",
  },
};

/* ─────────────────────────────────────────────────────────
 * Trace → TraceNode
 * Each engine step becomes a pill row; the step output becomes
 * its expandable detail block. Values are interpolated when the
 * step produced numbers (price, change, mcap).
 * ───────────────────────────────────────────────────────── */
function traceNode(line: {
  stepId: string;
  block: string;
  detail: string;
  output: Record<string, unknown>;
}): TraceNode {
  const out = line.output ?? {};
  const details = [
    { text: line.detail, tone: "muted" as const },
  ] as { text: string; tone: "add" | "del" | "ctx" | "muted" | "error" }[];
  const price = typeof out.price === "number" ? out.price : undefined;
  const chg = typeof out.percentChange24h === "number" ? out.percentChange24h : undefined;
  const balance = typeof out.balance === "number" ? out.balance : undefined;
  const fg = typeof out.value === "number" ? out.value : undefined;
  const mcap = typeof out.totalMarketCap === "number" ? out.totalMarketCap : undefined;

  if (price !== undefined) {
    details.push({
      text: `Price: $${price.toLocaleString("en-US", { maximumFractionDigits: 6 })}${chg !== undefined ? `  ·  24h ${chg >= 0 ? "+" : ""}${chg.toFixed(2)}%` : ""}`,
      tone: "add",
    });
  }
  if (balance !== undefined) {
    details.push({ text: `Balance: ${balance.toLocaleString("en-US", { maximumFractionDigits: 6 })} SOL`, tone: "add" });
  }
  if (fg !== undefined) {
    const cls = String(out.classification ?? "");
    details.push({ text: `Index: ${fg} / 100 — ${cls}`, tone: fg < 40 ? "error" : fg > 60 ? "add" : "muted" });
  }
  if (mcap !== undefined) {
    details.push({
      text: `Market cap: $${((mcap as number) / 1e12).toFixed(2)}T · 24h vol $${(((out.totalVolume24h ?? 0) as number) / 1e9).toFixed(1)}B`,
      tone: "add",
    });
  }

  return {
    type: line.block === "price.get" || line.block.startsWith("condition.") ? "tool" : "tool",
    toolName: line.block,
    primary: undefined, // label comes from the registry
    secondary: line.detail.length > 60 ? line.detail.slice(0, 60) + "…" : line.detail,
    details,
    args: {},
    result: out,
  };
}

/* ─────────────────────────────────────────────────────────
 * Transcript → reasoning sentences (what the agent "heard").
 * Splits the user's voice prompt into the rough thought chunks
 * the extractor uses when it builds the plan.
 * ───────────────────────────────────────────────────────── */
export function reasoningFromTranscript(transcript: string): string[] {
  const t = transcript.trim();
  if (!t) {
    return ["Reading your alert request…", "No transcript yet — say something like “warn me when SOL drops below $150”."];
  }
  const sentences = t.split(/(?<=[.!?])\s+/).filter((s) => s.trim());
  // Keep ≤ 4 compact "thought" lines, prefixed so they read like planning.
  const picks = sentences.slice(0, 4);
  const out = [];
  out.push(`Parsing your alert: “${t.slice(0, 72)}${t.length > 72 ? "…" : ""}”`);
  for (const s of picks) {
    out.push(`Looking for the trigger in “${s.slice(0, 48)}${s.length > 48 ? "…" : ""}”`);
  }
  out.push("Choosing the monitor blocks that satisfy it.");
  return out.slice(0, 5);
}

/* ─────────────────────────────────────────────────────────
 * Main view — runs the animated workflow over a real trace.
 * ───────────────────────────────────────────────────────── */
export interface AgentRunViewProps {
  transcript: string;
  trace: Array<{ stepId: string; block: string; detail: string; output: Record<string, unknown> }>;
  triggered: boolean;
  messages?: string[];
  error?: string;
  autoPlay?: boolean;
}

export default function AgentRunView({
  transcript,
  trace,
  triggered,
  messages = [],
  error,
  autoPlay = true,
}: AgentRunViewProps) {
  const phases: AgentPhase[] = React.useMemo(() => {
    const nodes: TraceNode[] = [
      {
        type: "reasoning",
        sentences: reasoningFromTranscript(transcript),
        durationSeconds: Math.max(2, Math.min(6, trace.length + 1)),
      },
      ...trace.map(traceNode),
    ];

    let message: string;
    if (error) {
      message = `The run hit a snag: ${error}`;
    } else if (triggered) {
      message = `Conditions met — alert ${messages.length ? "sent" : "would fire"}.${messages[0] ? ` ${messages[0]}` : ""}`;
    } else {
      message = "Conditions not met — no alert. Adjust the threshold in the plan and run the trace again.";
    }

    // One phase: think → act → conclude.
    return [{ trace: nodes, message }];
  }, [transcript, trace, triggered, messages, error]);

  return (
    <AgentWorkflow
      phases={phases}
      tools={VF_TOOLS}
      workingLabel="Analyzing your alert…"
      onComplete={() => {
        /* streaming conclusion finishes the view */
      }}
    />
  );
}