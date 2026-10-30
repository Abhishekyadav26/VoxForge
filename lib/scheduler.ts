import { listAgents, getUserById, markAgentRun, saveRun, type AgentRecord } from "@/lib/db";
import { runSpec } from "@/lib/interpreter";
import { sendTelegram } from "@/lib/blocks/notify";

/** Parse "60s" | "5m" | "1h" | "1d" into milliseconds. Returns null if unparseable. */
export function parseEvery(every?: string): number | null {
  if (!every) return null;
  const m = every.trim().match(/^(\d+)\s*(s|m|h|d)$/i);
  if (!m) return null;
  const n = Number(m[1]);
  const unit = { s: 1e3, m: 6e4, h: 36e5, d: 864e5 }[m[2].toLowerCase() as "s" | "m" | "h" | "d"];
  // Never poll faster than once a minute, so one agent can't hammer CoinMarketCap.
  return Math.max(n * unit, 60_000);
}

/** Tokens CoinMarketCap can price. Anything else (e.g. MISSING_TOKEN) is invalid. */
export function hasValidTokens(agent: AgentRecord): boolean {
  return agent.spec.steps
    .filter((st) => st.block === "price.get")
    .every((st) => /^[A-Z]{2,6}$/.test(String(st.params.token ?? "").toUpperCase()));
}

/** An agent is due when it has an interval trigger and its last run is old enough. */
export function isDue(agent: AgentRecord, now: number = Date.now()): boolean {
  const spec = agent.spec;
  if (spec.trigger.type !== "interval") return false;
  // An alert with no condition would fire on every tick. Never auto-run one.
  const hasCondition = spec.steps.some((st) => st.block.startsWith("condition."));
  if (!hasCondition) return false;
  if (!hasValidTokens(agent)) return false;
  const every = parseEvery(spec.trigger.every);
  if (!every) return false;
  if (!agent.lastRun) return true;
  return now - new Date(agent.lastRun).getTime() >= every;
}

export interface RunOutcome {
  agentId: string;
  name: string;
  ok: boolean;
  triggered?: boolean;
  /** True only when an alert was actually sent to Telegram this tick. */
  sent?: boolean;
  error?: string;
}

/**
 * Run one agent end to end: evaluate its spec, send alerts to the owner's
 * bound Telegram chat (or the global fallback), and record the run.
 * Used by both the manual "Run now" button and the scheduler.
 */
export async function executeAgent(
  agent: AgentRecord,
  opts: { onlyOnTransition?: boolean } = {}
): Promise<RunOutcome> {
  try {
    const owner = agent.userId ? await getUserById(agent.userId) : undefined;

    if (opts.onlyOnTransition) {
      // Evaluate without sending first. runSpec sends alerts itself, so the
      // decision has to happen before the real run.
      const check = await runSpec(agent.spec, { dryRun: true });
      if (!check.success) {
        return { agentId: agent.id, name: agent.name, ok: false, error: check.error };
      }
      if (!check.triggered || agent.lastTriggered) {
        // Not met, or already alerted while it stayed met: record and stay quiet.
        await markAgentRun(agent.id, check.triggered, agent.userId);
        return { agentId: agent.id, name: agent.name, ok: true, triggered: check.triggered, sent: false };
      }
    }

    const result = await runSpec(agent.spec, {
      dryRun: false,
      telegramChatId: owner?.telegramChatId,
    });
    await markAgentRun(agent.id, result.triggered, agent.userId);
    await saveRun(
      { agentId: agent.id, triggered: result.triggered, trace: result.trace, messages: result.messages },
      agent.userId
    );
    return {
      agentId: agent.id, name: agent.name, ok: result.success,
      triggered: result.triggered, sent: result.triggered, error: result.error,
    };
  } catch (e: any) {
    return { agentId: agent.id, name: agent.name, ok: false, sent: false, error: e?.message ?? String(e) };
  }
}

/** Run every interval-based agent that is due right now. */
export async function runDueAgents(now: number = Date.now()): Promise<RunOutcome[]> {
  const agents = await listAgents(); // no userId → all owners
  const due = agents.filter((a) => isDue(a, now));
  const outcomes: RunOutcome[] = [];
  for (const a of due) outcomes.push(await executeAgent(a, { onlyOnTransition: true }));
  return outcomes;
}

/** Send the one-time "agent is live" confirmation to the owner's chat. */
export async function sendDeployConfirmation(agent: AgentRecord): Promise<void> {
  const owner = agent.userId ? await getUserById(agent.userId) : undefined;
  const every = agent.spec.trigger.every;
  const cadence =
    agent.spec.trigger.type === "interval" && every
      ? `checking every ${every}`
      : "running on demand";
  const msg = `✅ Agent deployed: ${agent.name}\n${cadence}. You'll get an alert here when its condition is met.`;
  await sendTelegram(msg, { chatId: owner?.telegramChatId });
}
