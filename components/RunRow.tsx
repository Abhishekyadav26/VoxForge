"use client";

import { useState } from "react";
import type { RunRecord } from "@/lib/db";
import { fmtDate } from "./SpecSummary";

/** Relative time: "5m ago", "2h ago", "Nov 3". */
function rel(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return iso;
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return fmtDate(iso);
}

function lineText(l: { block: string; detail: string }): string {
  return l.detail;
}

/** One run: relative time + triggered pill + expandable trace lines. */
export default function RunRow({ run }: { run: RunRecord }) {
  const [open, setOpen] = useState(false);
  const trace = Array.isArray(run.trace) ? run.trace : [];
  return (
    <div className="rounded border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 text-left"
      >
        <span
          className={
            "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold " +
            (run.triggered
              ? "border-emerald-800 bg-emerald-950/60 text-emerald-200"
              : "border-slate-700 bg-slate-900 text-slate-300")
          }
        >
          {run.triggered ? "● triggered" : "○ no trigger"}
        </span>
        <span className="text-xs text-slate-400">{rel(run.executedAt)}</span>
        <span className="ml-auto text-xs text-slate-400">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <ul className="mt-2 space-y-1 border-t border-slate-800 pt-2 text-xs text-slate-300">
          {trace.map((l: any, i: number) => (
            <li key={i}>
              <span className="font-mono text-slate-500">{l.stepId}</span> · {lineText(l)}
            </li>
          ))}
          {run.messages?.map((m: string, i: number) => (
            <li key={"m" + i} className="text-emerald-200">✉️ {m}</li>
          ))}
          {!trace.length && <li className="text-slate-500">No trace lines.</li>}
        </ul>
      )}
    </div>
  );
}
