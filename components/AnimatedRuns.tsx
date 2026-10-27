"use client";
import { AnimatedList, AnimatedListItem } from "@/components/ui/animated-list";

export interface RunItem {
  id: string;
  executedAt: string;
  triggered: boolean;
  trace: unknown[];
}

/** Log of agent runs, each entry animating in with a spring (Magic UI AnimatedList). */
export default function AnimatedRuns({ runs }: { runs: RunItem[] }) {
  return (
    <AnimatedList delay={250} className="space-y-2">
      {runs.map((r) => (
        <AnimatedListItem key={r.id}>
          <div className="rounded border border-slate-700 bg-slate-900 p-3 text-sm">
            <div>
              <span className="font-mono text-xs text-slate-500">{r.id}</span>
              <span className="mx-2 text-slate-600">·</span>
              {r.executedAt} —{" "}
              {r.triggered ? (
                <span className="font-semibold text-emerald-400">🔔 triggered</span>
              ) : (
                <span className="text-slate-400">no trigger</span>
              )}
            </div>
            {r.trace && r.trace.length > 0 && (
              <pre className="mt-2 overflow-auto text-xs text-slate-300">
                {JSON.stringify(r.trace, null, 2)}
              </pre>
            )}
          </div>
        </AnimatedListItem>
      ))}
    </AnimatedList>
  );
}