import Groq from "groq-sdk";

/**
 * Model fallback chain, best quality → highest quota.
 * gpt-oss-120b is the strongest but has the tightest daily limits
 * (1K req/day); lower models take over automatically on 404 (retired),
 * 429 (rate-limited) or empty output.
 */
const DEFAULT_CHAIN = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen3.8-27b",
  "allam-2-7b",
  "openai/gpt-oss-safeguard-20b",
];

/**
 * Resolve the model chain.
 * - GROQ_MODEL overrides the primary model.
 * - GROQ_MODEL_FALLBACKS (comma-separated) replaces the whole chain.
 */
export function modelChain(): string[] {
  const envChain = (process.env.GROQ_MODEL_FALLBACKS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (envChain.length) return envChain;
  if (process.env.GROQ_MODEL) {
    return [process.env.GROQ_MODEL, ...DEFAULT_CHAIN.filter((m) => m !== process.env.GROQ_MODEL)];
  }
  return [...DEFAULT_CHAIN];
}

function shouldFailOver(e: unknown): boolean {
  const err = e as { status?: number; error?: { code?: string } };
  return (
    err?.status === 404 || // model retired / not on this account
    err?.status === 429 || // quota exhaustion → next model
    err?.error?.code === "model_not_found"
  );
}

export interface GroqChatOpts {
  json?: boolean;
  maxTokens?: number;
}

/** One chat completion, walking the model chain. Throws if all models fail. */
export async function groqChat(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  opts: GroqChatOpts = {}
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not set");
  const groq = new Groq({ apiKey });
  const chain = modelChain();
  let lastErr: unknown = new Error("No models configured");

  for (const model of chain) {
    try {
      const res = await groq.chat.completions.create({
        model,
        max_tokens: opts.maxTokens ?? 1500,
        ...(opts.json ? { response_format: { type: "json_object" } as const } : {}),
        messages,
      });
      const text = res.choices?.[0]?.message?.content?.trim() ?? "";
      if (text) return text;
      lastErr = new Error(`Empty response from ${model}`);
      console.warn(`[groq] empty response from ${model}, trying next…`);
    } catch (e) {
      lastErr = e;
      if (!shouldFailOver(e)) throw e; // auth etc. — let the caller handle it
      console.warn(
        `[groq] ${model} unavailable (${(e as { status?: number }).status ?? "?"}), trying next…`
      );
    }
  }
  throw lastErr;
}