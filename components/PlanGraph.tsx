"use client";
import ReactFlow, { Background, Handle, MarkerType, Position, type Node, type Edge } from "reactflow";
import "reactflow/dist/style.css";
import { useMemo } from "react";
import { BorderBeam } from "@/components/ui/border-beam";
import type { AgentSpec } from "@/lib/spec-schema";

const KIND_STYLE: Record<string, { bg: string; fg: string; ring?: string }> = {
  /* ux-visual C1: #0b0b0b on #8d8d8d = 6.0:1 (light text was 3.0:1) */
  step: { bg: "#8d8d8d", fg: "#0b0b0b" },
  condition: { bg: "#c9c9c9", fg: "#0b0b0b" },
  action: { bg: "#c9c9c9", fg: "#0b0b0b" },
  /* ux-visual C5: triggered run tints the notify node so status is visible in the diagram */
  fired: { bg: "#065f46", fg: "#d1fae5", ring: "0 0 0 2px #34d399" },
  idle: { bg: "#3f3f46", fg: "#d4d4d8", ring: "0 0 0 1px #52525b" },
};

const HANDLE: React.CSSProperties = {
  width: 6,
  height: 6,
  background: "#71717a",
  border: "none",
};

function SpecNode({ data }: { data: { label: string; kind: string } }) {
  const s = KIND_STYLE[data.kind] ?? KIND_STYLE.step;
  return (
    <div style={{ background: s.bg, color: s.fg, border: "1px solid rgba(0,0,0,.3)", borderRadius: 8, padding: "8px 12px", fontSize: 13, fontWeight: 600, maxWidth: 280, boxShadow: s.ring ?? undefined }}>
      <Handle type="target" position={Position.Top} id="top" style={HANDLE} />
      <Handle type="target" position={Position.Left} id="left" style={HANDLE} />
      {data.label}
      <Handle type="source" position={Position.Bottom} id="bottom" style={HANDLE} />
      <Handle type="source" position={Position.Right} id="right" style={HANDLE} />
    </div>
  );
}
const nodeTypes = { specNode: SpecNode };

function summarize(s: AgentSpec["steps"][number]): string {
  const p = s.params as Record<string, any>;
  switch (s.block) {
    case "price.get": return `${s.id} · price.get · ${p.token} → ${p.currency}`;
    case "wallet.getBalance": return `${s.id} · wallet.getBalance · ${p.chain} · ${p.address}`;
    case "market.fearGreed": return `${s.id} · market.fearGreed · CMC index`;
    case "market.globalMetrics": return `${s.id} · market.globalMetrics · ${p.currency ?? "USD"}`;
    case "condition.compare": return `${s.id} · compare · ${p.left} ${p.op} ${p.right}`;
    case "condition.percentChange": return `${s.id} · %change · ${p.value} ${p.percentChange}% (${p.timeWindow})`;
    default: return s.id;
  }
}

interface Props { spec: AgentSpec; onSelectStep: (id: string | null) => void; triggered?: boolean }

/** React Flow visualization: steps (slate), conditions (amber), action (green). */
export default function PlanGraph({ spec, onSelectStep, triggered }: Props) {
  const { nodes, edges } = useMemo(() => {
    /* ux-visual C5: x=56 leaves room for the zoom toolbar inside the padded panel;
       action at x=300 keeps the node inside the 240px canvas after fitView. */
    const ns: Node[] = spec.steps.map((s, i) => ({
      id: s.id, type: "specNode", position: { x: 56, y: i * 90 },
      data: { label: summarize(s), kind: s.block.startsWith("condition.") ? "condition" : "step" },
    }));
    ns.push({ id: "action", type: "specNode", position: { x: 300, y: Math.max(0, spec.steps.length - 1) * 90 }, data: { label: "notify.telegram" + (triggered === true ? " · fired" : triggered === false ? " · idle" : ""), kind: triggered === undefined ? "action" : triggered ? "fired" : "idle" } });
    const es: Edge[] = [];
    const ref = (v: string) => v.match(/(s\d+)/)?.[1] ?? null;
    spec.steps.forEach((s) => {
      const p = s.params as Record<string, any>;
      for (const key of ["left", "value"]) {
        const src = p[key] ? ref(p[key]) : null;
        if (src) es.push({ id: `${src}-→-${s.id}-${key}`, source: src, target: s.id, sourceHandle: "bottom", targetHandle: "top", type: "smoothstep", markerEnd: { type: MarkerType.ArrowClosed } });
      }
    });
    const conds = spec.steps.filter((s) => s.block.startsWith("condition."));
    const last = conds.length ? conds[conds.length - 1].id : spec.steps[spec.steps.length - 1].id;
    es.push({ id: `${last}-→-action`, source: last, target: "action", sourceHandle: "right", targetHandle: "left", type: "smoothstep", markerEnd: { type: MarkerType.ArrowClosed } });
    return { nodes: ns, edges: es };
  }, [spec, triggered]);

  return (
    /* ux-visual C5: left padding clears the zoom toolbar so it can't overlap nodes */
    <div className="relative h-full overflow-hidden rounded-xl border border-slate-700/70 bg-slate-900/60 pl-12 shadow-sm">
      <BorderBeam size={220} duration={10} colorFrom="#8d8d8d" colorTo="#3a3a3a" />
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView onNodeClick={(_, n) => onSelectStep(n.id === "action" ? null : n.id)} zoomOnScroll={false} panOnDrag={false}>
        <Background gap={16} />
        {/* ux-visual C5: read-only artifact — no controls to overlap nodes */}
      </ReactFlow>
    </div>
  );
}
