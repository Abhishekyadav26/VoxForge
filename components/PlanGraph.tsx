"use client";
import ReactFlow, { Background, Controls, MarkerType, type Node, type Edge } from "reactflow";
import "reactflow/dist/style.css";
import { useMemo } from "react";
import type { AgentSpec } from "@/lib/spec-schema";

const KIND_STYLE: Record<string, { bg: string; fg: string }> = {
  step: { bg: "#64748b", fg: "#fff" },
  condition: { bg: "#f59e0b", fg: "#1f2937" },
  action: { bg: "#10b981", fg: "#fff" },
};

function SpecNode({ data }: { data: { label: string; kind: string } }) {
  const s = KIND_STYLE[data.kind] ?? KIND_STYLE.step;
  return (<div style={{ background: s.bg, color: s.fg, border: "1px solid rgba(0,0,0,.3)", borderRadius: 8, padding: "8px 12px", fontSize: 13, fontWeight: 600, maxWidth: 280 }}>{data.label}</div>);
}
const nodeTypes = { specNode: SpecNode };

function summarize(s: AgentSpec["steps"][number]): string {
  const p = s.params as Record<string, any>;
  switch (s.block) {
    case "price.get": return `${s.id} · price.get · ${p.token} → ${p.currency}`;
    case "wallet.getBalance": return `${s.id} · wallet.getBalance · ${p.chain} · ${p.address}`;
    case "condition.compare": return `${s.id} · compare · ${p.left} ${p.op} ${p.right}`;
    case "condition.percentChange": return `${s.id} · %change · ${p.value} ${p.percentChange}% (${p.timeWindow})`;
    default: return s.id;
  }
}

interface Props { spec: AgentSpec; onSelectStep: (id: string | null) => void; }

/** React Flow visualization: steps (slate), conditions (amber), action (green). */
export default function PlanGraph({ spec, onSelectStep }: Props) {
  const { nodes, edges } = useMemo(() => {
    const ns: Node[] = spec.steps.map((s, i) => ({
      id: s.id, type: "specNode", position: { x: 0, y: i * 90 },
      data: { label: summarize(s), kind: s.block.startsWith("condition.") ? "condition" : "step" },
    }));
    ns.push({ id: "action", type: "specNode", position: { x: 340, y: Math.max(0, spec.steps.length - 1) * 90 }, data: { label: "notify.telegram → 📨", kind: "action" } });
    const es: Edge[] = [];
    const ref = (v: string) => v.match(/(s\d+)/)?.[1] ?? null;
    spec.steps.forEach((s) => {
      const p = s.params as Record<string, any>;
      for (const key of ["left", "value"]) {
        const src = p[key] ? ref(p[key]) : null;
        if (src) es.push({ id: `${src}-→-${s.id}-${key}`, source: src, target: s.id, type: "smoothstep", markerEnd: { type: MarkerType.ArrowClosed } });
      }
    });
    const conds = spec.steps.filter((s) => s.block.startsWith("condition."));
    const last = conds.length ? conds[conds.length - 1].id : spec.steps[spec.steps.length - 1].id;
    es.push({ id: `${last}-→-action`, source: last, target: "action", type: "smoothstep", markerEnd: { type: MarkerType.ArrowClosed } });
    return { nodes: ns, edges: es };
  }, [spec]);

  return (<div className="rounded border border-slate-700 p-2">
    <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView onNodeClick={(_, n) => onSelectStep(n.id === "action" ? null : n.id)}>
      <Background gap={16} />
      <Controls />
    </ReactFlow>
    <div className="mt-1 flex gap-4 px-2 py-1 text-xs text-slate-400">
      <span><span className="mr-1 inline-block h-3 w-3 rounded" style={{ background: "#64748b" }} />step</span>
      <span><span className="mr-1 inline-block h-3 w-3 rounded" style={{ background: "#f59e0b" }} />condition</span>
      <span><span className="mr-1 inline-block h-3 w-3 rounded" style={{ background: "#10b981" }} />action</span>
    </div>
  </div>);
}
