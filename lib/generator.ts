import { promises as fs } from "fs";
import path from "path";
import Groq from "groq-sdk";
import { AgentSpec } from "./spec-schema";

const PROMPT_FILE = path.join(process.cwd(), "code-generator-prompt.md");

/** Deterministic template generator (no LLM needed). */
export function generateCode(spec: AgentSpec): string {
  const steps = spec.steps
    .map((s) => {
      switch (s.block) {
        case "price.get":
          return `  // ${s.id}: current price\n  outputs["${s.id}"] = await getPrice(${JSON.stringify((s.params as any).token)}, ${JSON.stringify((s.params as any).currency ?? "USD")});`;
        case "wallet.getBalance":
          return `  // ${s.id}: wallet balance\n  outputs["${s.id}"] = await getBalance(${JSON.stringify((s.params as any).chain ?? "solana")}, ${JSON.stringify((s.params as any).address)});`;
        case "condition.compare":
          return `  // ${s.id}: compare\n  outputs["${s.id}"] = compare(resolveNum("${(s.params as any).left}", outputs), ${JSON.stringify((s.params as any).op)}, ${JSON.stringify((s.params as any).right)});`;
        case "condition.percentChange":
          return `  // ${s.id}: percent change\n  outputs["${s.id}"] = percentChangeCheck(resolveNum("${(s.params as any).value}", outputs), ${JSON.stringify((s.params as any).percentChange)}, ${JSON.stringify((s.params as any).timeWindow ?? "1h")});`;
        default:
          return `  // ${s.id}: unknown block ${s.block}`;
      }
    })
    .join("\n");

  const messages = spec.actions
    .map((a) => `    await sendTelegram(renderMessage(${JSON.stringify(a.params.message)}, outputs));`)
    .join("\n");

  return `// Generated agent: ${spec.name}
// Trigger: ${spec.trigger.type}${spec.trigger.every ? ` every ${spec.trigger.every}` : ""}
import { getPrice } from "./blocks/price";
import { getBalance } from "./blocks/wallet";
import { compare, percentChangeCheck } from "./blocks/condition";
import { renderMessage, sendTelegram } from "./blocks/notify";

function resolveNum(ref: string, outputs: Record<string, any>): number {
  const [sid, field] = ref.split(".");
  const v = outputs[sid]?.[field];
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n)) throw new Error("Cannot resolve ref " + ref);
  return n;
}

export async function run() {
  const outputs: Record<string, any> = {};
${steps}
  const conditions = ${JSON.stringify(spec.steps.filter((s) => s.block.startsWith("condition.")).map((s) => s.id))};
  const triggered = conditions.length === 0 || conditions.every((id) => outputs[id]?.result === true);
  if (triggered) {
${messages}
  }
  return { triggered, outputs };
}
`;
}

/** Groq-based generation — used when an API key is set. */
async function generateCodeWithGroq(spec: AgentSpec): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not set");
  const groq = new Groq({ apiKey });
  const system = await fs.readFile(PROMPT_FILE, "utf8");

  const attempt = async (): Promise<string> => {
    const res = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL ?? "openai/gpt-oss-120b",
      max_tokens: 2500,
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify(spec, null, 2) },
      ],
    });
    return res.choices?.[0]?.message?.content ?? "";
  };

  try {
    return await attempt();
  } catch (e) {
    console.warn("Groq code gen attempt 1 failed, retrying once…", e);
    return await attempt();
  }
}

/** Groq first, deterministic template as fallback — app always works. */
export async function generateCodeBestEffort(spec: AgentSpec): Promise<string> {
  if (process.env.GROQ_API_KEY) {
    try {
      const code = await generateCodeWithGroq(spec);
      if (code.trim()) return code;
    } catch (e) {
      console.warn("Groq code generation failed, using template:", e);
    }
  }
  return generateCode(spec);
}