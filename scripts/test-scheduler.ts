import { parseEvery, isDue } from "../lib/scheduler";
import type { AgentRecord } from "../lib/db";
let fails = 0;
const eq = (name: string, a: unknown, b: unknown) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (!ok) fails++;
  console.log(`${ok ? "✅" : "❌"} ${name}: ${JSON.stringify(a)}${ok ? "" : ` (want ${JSON.stringify(b)})`}`);
};
eq("parse 5m", parseEvery("5m"), 300_000);
eq("parse 1h", parseEvery("1h"), 3_600_000);
eq("floor 10s → 60s", parseEvery("10s"), 60_000);
eq("garbage → null", parseEvery("soon"), null);
const spec = (trigger: any) => ({ name: "t", steps: [], conditions: [], actions: [], trigger, missingFields: [] }) as any;
const now = Date.parse("2026-10-30T12:00:00Z");
const mk = (trigger: any, lastRun?: string): AgentRecord =>
  ({ id: "a", name: "a", spec: spec(trigger), createdAt: "", lastRun } as AgentRecord);
eq("never run → due", isDue(mk({ type: "interval", every: "5m" }), now), true);
eq("ran 2m ago, every 5m → not due", isDue(mk({ type: "interval", every: "5m" }, "2026-10-30T11:58:00Z"), now), false);
eq("ran 6m ago, every 5m → due", isDue(mk({ type: "interval", every: "5m" }, "2026-10-30T11:54:00Z"), now), true);
eq("webhook trigger never auto-runs", isDue(mk({ type: "webhook" }), now), false);
eq("event trigger never auto-runs", isDue(mk({ type: "event" }), now), false);
console.log(fails ? `\n${fails} FAILED` : "\nall scheduler tests passed");
process.exit(fails ? 1 : 0);
