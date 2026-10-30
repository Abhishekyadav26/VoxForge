"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  AgentWorkflow,
  type AgentPhase,
  type TraceNode,
} from "@/components/ui/ai-agent-response";
import { reasoningFromTranscript, VF_TOOLS } from "@/components/AgentRunView";
import AgentRunView from "@/components/AgentRunView";
import PlanGraph from "@/components/PlanGraph";
import EditSpecPanel from "@/components/EditSpecPanel";
import TelegramConnect from "@/components/TelegramConnect";
import { Link } from "next-view-transitions";
import type { AgentSpec } from "@/lib/spec-schema";

export type TraceLine = {
  stepId: string;
  block: string;
  detail: string;
  output: Record<string, unknown>;
};

export type ThreadItem =
  | { id: number; role: "user"; text: string }
  | {
      id: number;
      role: "agent";
      kind: "plan";
      transcript: string;
      spec: AgentSpec | null;
      loading: boolean;
      error?: string;
    }
  | {
      id: number;
      role: "agent";
      kind: "trace";
      spec: AgentSpec;
      trace: TraceLine[];
      triggered: boolean;
      messages: string[];
      error?: string;
      loading: boolean;
    }
  | { id: number; role: "agent"; kind: "deploy"; agentId?: string; error?: string };

/* ──────────────────────────────── bubbles ──────────────────────────────── */

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl bg-muted px-4 py-2.5 text-[14px] leading-relaxed text-foreground shadow-sm text-balance">
        {text}
      </div>
    </div>
  );
}

function AgentCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "w-full max-w-[95%] rounded-xl border border-slate-700/70 bg-slate-900/60 px-3.5 py-3 shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

function TypingBubble({ label }: { label: string }) {
  return (
    <div className="flex justify-start">
      <AgentCard className="w-auto px-4 py-2.5">
        <p className="flex items-center gap-2 text-[13px] text-slate-300">
          <span className="flex items-end gap-0.5">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500 [animation-delay:0ms]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500 [animation-delay:120ms]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500 [animation-delay:240ms]" />
          </span>
          {label}
        </p>
      </AgentCard>
    </div>
  );
}

function summarizeStep(s: AgentSpec["steps"][number]): string {
  const p = s.params as Record<string, any>;
  switch (s.block) {
    case "price.get":
      return `${p.token} live price → ${p.currency ?? "USD"}`;
    case "wallet.getBalance":
      return `Wallet balance · ${p.chain ?? "solana"}`;
    case "market.fearGreed":
      return "CMC Fear & Greed index";
    case "market.globalMetrics":
      return `Global market metrics (${p.currency ?? "USD"})`;
    case "condition.compare":
      return `When ${p.left ?? "?"} ${p.op ?? "?"} ${p.right ?? "?"}`;
    case "condition.percentChange":
      return `${p.value ?? "?"} changed ${p.percentChange ?? "?"}% (${p.timeWindow ?? "1h"})`;
    default:
      return s.id;
  }
}

/* Plan bubble: thinking workflow → then graph + edit. */
function PlanBubble({
  item,
  selectedStep,
  onSelectStep,
  onSaveSpec,
}: {
  item: Extract<ThreadItem, { kind: "plan" }>;
  selectedStep: string | null;
  onSelectStep: (id: string | null) => void;
  onSaveSpec: (spec: AgentSpec) => void;
}) {
  const [revealed, setRevealed] = React.useState(false);

  const phases: AgentPhase[] = React.useMemo(() => {
    if (!item.spec) return [];
    const nodes: TraceNode[] = [
      {
        type: "reasoning",
        sentences: reasoningFromTranscript(item.transcript),
        durationSeconds: Math.min(4, item.spec.steps.length + 1),
      },
      ...item.spec.steps.map(
        (s): TraceNode => ({
          type: "tool",
          toolName: s.block,
          secondary: summarizeStep(s),
          details: [
            { text: s.id, tone: "muted" },
            { text: summarizeStep(s), tone: "add" },
          ],
        })
      ),
    ];
    return [
      {
        trace: nodes,
      },
    ];
  }, [item.spec, item.transcript]);

  if (item.loading || !item.spec) return <TypingBubble label="Building your plan…" />;

  return (
    <AgentCard className="border-transparent bg-transparent px-0 py-0 shadow-none">
      <AgentWorkflow
        phases={phases}
        tools={VF_TOOLS}
        workingLabel="Building your plan…"
        onComplete={() => setRevealed(true)}
      />
      {item.error && <p className="mt-1 text-[12.5px] text-rose-300">Error: {item.error}</p>}
      {revealed && (
        <div className="mt-2 space-y-2">
          <div className="h-[240px]">
            <PlanGraph spec={item.spec} onSelectStep={onSelectStep} />
          </div>
          <EditSpecPanel spec={item.spec} stepId={selectedStep} onSave={onSaveSpec} />
        </div>
      )}
    </AgentCard>
  );
}

/* Trace bubble: live dry-run animated over the real engine trace. */
function TraceBubble({ item }: { item: Extract<ThreadItem, { kind: "trace" }> }) {
  if (item.loading) return <TypingBubble label="Running your monitor against live prices…" />;
  return (
    <AgentCard className="border-transparent bg-transparent px-0 py-0 shadow-none">
      <AgentRunView
        transcript={item.spec.name}
        trace={item.trace}
        triggered={item.triggered}
        messages={item.messages}
        error={item.error}
      />
      {item.error && <p className="mt-1 text-[12.5px] text-rose-300">Error: {item.error}</p>}
    </AgentCard>
  );
}

/* Deploy bubble: confirmation + Telegram connect. */
function DeployBubble({ item }: { item: Extract<ThreadItem, { kind: "deploy" }> }) {
  return (
    <div className="max-w-[95%] space-y-2">
      {item.error ? (
        <AgentCard>
          <p className="text-[13.5px] text-rose-200">Deploy failed: {item.error}</p>
        </AgentCard>
      ) : item.agentId ? (
        <>
          <AgentCard className="border-emerald-800/70 bg-emerald-950/30">
            <p className="text-[14px] text-emerald-100">
              ✅ Agent deployed and live.
              {item.agentId && (
                <>
                  {" "}
                  <Link href={"/agents/" + item.agentId} className="font-medium text-emerald-300 underline underline-offset-2">
                    View agent →
                  </Link>
                </>
              )}
            </p>
          </AgentCard>
          <TelegramConnect />
        </>
      ) : (
        <TypingBubble label="Deploying your agent…" />
      )}
    </div>
  );
}

/* Welcome hint from the assistant. */
function WelcomeBubble() {
  return (
    <div className="flex justify-start">
      <AgentCard className="w-auto">
        <p className="max-w-md text-[13.5px] leading-relaxed text-slate-300">
          🎙️ Say what you want to watch — e.g.{" "}
          <span className="text-slate-100">“alert me when SOL drops below $150”</span> — then:
          <span className="mt-1.5 block space-y-0.5 pl-1 text-slate-400">
            <span className="block">· “generate plan” — build the monitor spec</span>
            <span className="block">· “run the trace” — dry-run against live prices</span>
            <span className="block">· “deploy” — save the agent &amp; arm Telegram alerts</span>
            <span className="block">· “clear” — start a fresh thread</span>
          </span>
        </p>
      </AgentCard>
    </div>
  );
}

/* ──────────────────────────── the chat thread ──────────────────────────── */

export default function ChatThread({
  items,
  selectedStep,
  onSelectStep,
  onSaveSpec,
  endRef,
}: {
  items: ThreadItem[];
  selectedStep: string | null;
  onSelectStep: (id: string | null) => void;
  onSaveSpec: (spec: AgentSpec) => void;
  endRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="flex w-full flex-col gap-5">
      {items.length === 0 && <WelcomeBubble />}
      {items.map((item) => {
        if (item.role === "user") return <UserBubble key={item.id} text={item.text} />;
        if (item.kind === "plan")
          return (
            <PlanBubble
              key={item.id}
              item={item}
              selectedStep={selectedStep}
              onSelectStep={onSelectStep}
              onSaveSpec={onSaveSpec}
            />
          );
        if (item.kind === "trace") return <TraceBubble key={item.id} item={item} />;
        if (item.kind === "deploy") return <DeployBubble key={item.id} item={item} />;
        return null;
      })}
      <div ref={endRef as React.Ref<HTMLDivElement>} />
    </div>
  );
}