"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Compact agent progress row (Vibrant ref: Claude Code Live Progress Bar):
 * label + step-count chip on the left, ticked track in the middle, percentage
 * on the right. Rounded ends, low height, no glow.
 *
 * Accessibility: a single `role="progressbar"` with min/max/now and a label,
 * so screen readers get the number instead of two decorative spans.
 */
export function StepMeter({
  label,
  done,
  total,
  className,
}: {
  label: string;
  done: number;
  total: number;
  className?: string;
}) {
  const safeTotal = Math.max(1, total);
  const safeDone = Math.min(Math.max(0, done), safeTotal);
  const pct = Math.round((safeDone / safeTotal) * 100);
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="shrink-0 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">
        {label}
      </span>
      <span className="shrink-0 rounded-full border border-slate-700 px-2 py-0.5 text-[11px] tabular-nums text-slate-300">
        {safeDone}/{safeTotal}
      </span>
      <div
        role="progressbar"
        aria-label={`${label}: step ${safeDone} of ${safeTotal}`}
        aria-valuemin={0}
        aria-valuemax={safeTotal}
        aria-valuenow={safeDone}
        className="relative h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-700"
      >
        {/* tick marks: 10 fixed hairlines, purely decorative */}
        <span aria-hidden className="absolute inset-0 flex justify-between px-[2px]">
          {Array.from({ length: 10 }).map((_, i) => (
            <span key={i} className="h-full w-px bg-white/15" />
          ))}
        </span>
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 rounded-full bg-slate-200 transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 shrink-0 text-right text-[11px] tabular-nums text-slate-400">{pct}%</span>
    </div>
  );
}
