"use client";
import { useState } from "react";
import type { AgentSpec } from "@/lib/spec-schema";

interface Props {
  spec: AgentSpec;
  stepId: string | null;
  onSave: (updated: AgentSpec) => void;
}

/** Edit the params of the selected step (any block). */
export default function EditSpecPanel({ spec, stepId, onSave }: Props) {
  const step = spec.steps.find((s) => s.id === stepId) ?? null;
  const [draft, setDraft] = useState<Record<string, any> | null>(step ? { ...step.params } : null);
  if (!step || !draft) return null;
  const isCond = step.block.startsWith("condition.");
  const set = (k: string, v: any) => setDraft({ ...draft, [k]: v });
  return (<div className="rounded border border-slate-700 bg-slate-900 p-4">
    <div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-semibold">Edit {step.id} — {step.block}</h3><button onClick={() => onSave(spec)} className="text-xs text-slate-400 hover:text-white">✕</button></div>
    {Object.entries(draft).map(([k, v]) => {
      const isNum = typeof v === "number" || k === "right" || k === "percentChange";
      const isOp = k === "op";
      const placeholder = v === "MISSING_WALLET_ADDRESS";
      return (<div key={k} className="mb-2">
        <label className="mb-1 block text-xs text-slate-400">{k}{placeholder && <span className="ml-2 text-slate-300">missing — paste your address</span>}</label>
        {isOp ? <select value={v} onChange={(e) => set(k, e.target.value)} className="w-full rounded border border-slate-600 bg-slate-800 p-2 text-sm">{["<",">","<=",">=","=="].map((o) => <option key={o}>{o}</option>)}</select>
        : <input value={v === undefined ? "" : String(v)} type={isNum ? "number" : "text"} onChange={(e) => set(k, isNum ? Number(e.target.value) : e.target.value)} className={"w-full rounded border p-2 text-sm " + (placeholder ? "border-slate-400 bg-slate-800" : "border-slate-600 bg-slate-800")} />}
      </div>);
    })}
    {isCond && <p className="mb-3 text-xs text-slate-500">Refs like {"{s1.price}"} point at earlier step outputs.</p>}
    <button onClick={() => { const next = { ...spec, steps: spec.steps.map((s) => s.id === step.id ? { ...s, params: draft } : s) }; onSave(next); }} className="rounded bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-950">Save step</button>
  </div>);
}
