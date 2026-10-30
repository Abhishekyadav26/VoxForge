import { parseEvery, isDue, hasValidTokens } from "../lib/scheduler";
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
const COND_STEPS = [
  { id: "s1", block: "price.get", params: { token: "SOL", currency: "USD" } },
  { id: "s2", block: "condition.compare", params: { left: "s1.price", op: "<", right: 150 } },
];
const mk = (trigger: any, lastRun?: string): AgentRecord =>
  ({ id: "a", name: "a", createdAt: "", lastRun,
     spec: { ...spec(trigger), steps: COND_STEPS } } as AgentRecord);
eq("never run → due", isDue(mk({ type: "interval", every: "5m" }), now), true);
eq("ran 2m ago, every 5m → not due", isDue(mk({ type: "interval", every: "5m" }, "2026-10-30T11:58:00Z"), now), false);
eq("ran 6m ago, every 5m → due", isDue(mk({ type: "interval", every: "5m" }, "2026-10-30T11:54:00Z"), now), true);
eq("webhook trigger never auto-runs", isDue(mk({ type: "webhook" }), now), false);
eq("event trigger never auto-runs", isDue(mk({ type: "event" }), now), false);
console.log(fails ? `\n${fails} FAILED` : "\nall scheduler tests passed");
process.exit(fails ? 1 : 0);

// ---- transition + token rules (appended) ----
{
  let f = 0;
  const check = (name: string, got: unknown, want: unknown) => {
    const ok = JSON.stringify(got) === JSON.stringify(want);
    if (!ok) f++;
    console.log(`${ok ? "✅" : "❌"} ${name}: ${JSON.stringify(got)}`);
  };
  const cond = [
    { id: "s1", block: "price.get", params: { token: "BNB", currency: "USD" } },
    { id: "s2", block: "condition.compare", params: { left: "s1.price", op: ">", right: 650 } },
  ] as any;
  const withSteps = (steps: any, lastRun?: string, lastTriggered?: boolean): AgentRecord =>
    ({ id: "a", name: "a", createdAt: "", lastRun, lastTriggered,
       spec: { name: "t", steps, conditions: [], actions: [], trigger: { type: "interval", every: "5m" }, missingFields: [] } } as any);
  check("condition agent with valid token is due", isDue(withSteps(cond)), true);
  check("MISSING_TOKEN agent is never due", isDue(withSteps([
    { id: "s1", block: "price.get", params: { token: "MISSING_TOKEN", currency: "USD" } },
    { id: "s2", block: "condition.compare", params: { left: "s1.price", op: "<", right: 150 } },
  ])), false);
  check("no-condition agent is never due", isDue(withSteps([
    { id: "s1", block: "price.get", params: { token: "BNB", currency: "USD" } },
  ])), false);
  check("hasValidTokens BNB", hasValidTokens(withSteps(cond)), true);
  console.log(f ? `\n${f} transition/token FAILED` : "\ntransition/token tests passed");
  if (f) process.exit(1);
}
