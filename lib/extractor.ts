import { promises as fs } from "fs";
import path from "path";
import { AgentSpec, AgentSpecSchema } from "./spec-schema";
import { groqChat } from "./groq";

const DEFAULT_TRIGGER = { type: "interval", every: "60s" } as const;
const PROMPT_FILE = path.join(process.cwd(), "spec-extractor-prompt.md");

// ---------- helpers ----------
function intervalFor(text: string): string {
  const t = text.toLowerCase();
  const m = t.match(/every\s+(\d+)\s*(second|minute|hour)/);
  if (m) {
    const n = m[1];
    if (m[2].startsWith("second")) return `${n}s`;
    if (m[2].startsWith("minute")) return `${n}m`;
    return `${n}h`;
  }
  if (t.includes("10 minute")) return "10m";
  if (t.includes("5 minute")) return "5m";
  if (t.includes("hour")) return "1h";
  return "60s";
}

function tokenFrom(text: string): string {
  const m = text.toUpperCase().match(/\b(SOL|ETH|BTC|USDC|JUP|BONK|RAY)\b/);
  return m ? m[1] : "SOL";
}

/**
 * Market-wide intent detection: "fear and greed", "BTC dominance",
 * "total market cap" — backed by the market.fearGreed / market.globalMetrics
 * blocks. Returns the matched kind or null.
 */
type MarketIntent = "fearGreed" | "dominance" | "marketCap" | null;
function marketIntent(text: string): MarketIntent {
  const t = text.toLowerCase();
  if (/fear\s*(&|and)?\s*greed|sentiment|greed/.test(t)) return "fearGreed";
  if (/(btc|bitcoin)\s*dominance|dominance/.test(t)) return "dominance";
  if (/total\s+market\s*cap|market\s*cap|global\s+metrics/.test(t)) return "marketCap";
  return null;
}

/** Extract a numeric threshold like "below 20" / "above 50" / "< 30". */
function thresholdOf(text: string): { dir: "<" | ">"; n: number } | null {
  const t = text.toLowerCase();
  const down =
    t.match(/(?:below|under|less\s+than|drops?\s+below|<\s*)\s*(\d+(?:\.\d+)?)/) ??
    t.match(/<(\d+(?:\.\d+)?)/);
  if (down) return { dir: "<", n: parseFloat(down[1]) };
  const up =
    t.match(/(?:above|over|more\s+than|exceeds|rises?\s+above|>\s*)\s*(\d+(?:\.\d+)?)/) ??
    t.match(/>\s*(\d+(?:\.\d+)?)/);
  if (up) return { dir: ">", n: parseFloat(up[1]) };
  return null;
}

// ---------- local rule-based extractor (no API key needed) ----------
/**
 * Handles: "drops below $N" -> compare(<), "above $N" -> compare(>),
 * "drops by N%" -> percentChange(-N), "monitor wallet" -> getBalance.
 * Falls back to a partial spec with missingFields when info is absent.
 */
export function extractSpecLocal(transcript: string): AgentSpec {
  const text = transcript.trim();
  const token = tokenFrom(text);
  const every = intervalFor(text);
  const missingFields: string[] = [];

  const steps: AgentSpec["steps"] = [];
  let sid = 1;
  const nid = () => `s${sid++}`;

  const needsPrice = /\$|price|sol|eth|btc|usdc|jup|bonk|ray|rises|above|below/i.test(text);
  const needsWallet = /wallet|balance|my (sol|account)/i.test(text);
  const mkt = marketIntent(text);

  // Market-wide monitors (fear & greed / dominance / market cap) take
  // precedence: their block output is the subject, not a token price.
  const needsMarket = mkt !== null && !needsWallet;

  let priceId: string | undefined;
  let balId: string | undefined;

  if (needsPrice && !needsMarket) {
    priceId = nid();
    steps.push({ id: priceId, block: "price.get", params: { token, currency: "USD" } });
  }
  if (needsWallet) {
    balId = nid();
    steps.push({ id: balId, block: "wallet.getBalance", params: { chain: "solana", address: "MISSING_WALLET_ADDRESS" } });
    missingFields.push("wallet_address");
  }
  if (needsMarket) {
    const mktId = nid();
    steps.push({
      id: mktId,
      block: mkt === "fearGreed" ? "market.fearGreed" : "market.globalMetrics",
      params: mkt === "fearGreed" ? {} : { currency: "USD" },
    });
    const th = thresholdOf(text);
    if (th) {
      const field = mkt === "fearGreed" ? "value" : mkt === "dominance" ? "btcDominance" : "totalMarketCap";
      steps.push({ id: nid(), block: "condition.compare", params: { left: `${mktId}.${field}`, op: th.dir, right: th.n } });
    } else {
      missingFields.push(mkt === "fearGreed" ? "fear_greed_threshold" : "market_threshold");
    }
  }

  // Percent-change rule: "drops by 10%" / "down 10% in the last hour"
  // (price/wallet paths only — market-wide monitors use their own threshold).
  const pct =
    !needsMarket &&
    (text.match(/(?:drop?s?|fall?s?|fell|rise?s?|rose|increas\w*|decreas\w*|down|up)\s+(?:by\s+)?(?:more\s+than\s+|at\s+least\s+)?(\d+(?:\.\d+)?)\s*%/i) ??
      text.match(/(\d+(?:\.\d+)?)\s*%\s*(?:drop|fall|rise|change|in)/i));
  const window =
    text.match(/in (?:the )?last (?:\d+ )?(second|minute|hour|day)/i)?.[1] ??
    text.match(/(\d+m|\d+h)/i)?.[1] ??
    "1h";
  const windowFor = (w: string) => {
    const s = w.toLowerCase();
    if (s.startsWith("second")) return "60s";
    if (s.startsWith("minute")) return "5m";
    if (s.startsWith("hour")) return "1h";
    if (s.startsWith("day")) return "24h";
    return w;
  };
  if (pct) {
    const n = parseFloat(pct[1]);
    if (Number.isNaN(n)) {
      missingFields.push("percent_threshold");
    } else {
      const down = /drop|fall|fell|down|decreas/i.test(text) && !/rises|rose|increas/i.test(text);
      const onBalance = /wallet|balance/i.test(text) && balId !== undefined;
      const value = onBalance ? `${balId}.balance` : `${priceId}.price`;
      steps.push({
        id: nid(),
        block: "condition.percentChange",
        params: { value, percentChange: down ? -n : n, timeWindow: windowFor(window) },
      });
    }
  }

  // Absolute threshold: "below $150" / "above $2000". Only when a direction
  // or a $ sign is present — so "by 10%" never double-fires as a compare.
  // Skipped for market-wide monitors (their threshold is already a compare).
  const hasDir = /below|under|above|over|exceeds?|drops?\s+(?:below|to)|falls?\s+(?:below|to)|rises?\s+(?:above|to)/i.test(text);
  const hasDollar = /\$/.test(text);
  if (!needsMarket && (!pct || hasDir || hasDollar)) {
    const abs = text.match(/\$\s*(\d+(?:\.\d+)?)/i) ?? text.match(/(\d+(?:\.\d+)?)\s*(?!%)/);
    if (abs && (hasDir || hasDollar)) {
      const dir = /below|under|drops?|falls?|fell|</i.test(text) ? "<" : ">";
      const left = needsWallet && !needsPrice ? `${balId}.balance` : `${priceId}.price`;
      steps.push({ id: nid(), block: "condition.compare", params: { left, op: dir, right: parseFloat(abs[1]) } });
    } else if (needsPrice && (!abs || !hasDir)) {
      missingFields.push("threshold");
    }
  }

  const hasCond = steps.some((s) => s.block.startsWith("condition."));
  // Guarantee at least one step (schema requires min 1): default to a price
  // fetch when nothing specific was detected.
  if (steps.length === 0) {
    priceId = nid();
    steps.push({ id: priceId, block: "price.get", params: { token, currency: "USD" } });
  }
  // Market message references live block outputs with ${sN.field} tokens.
  let marketMessage = "";
  if (needsMarket) {
    const mktStep = steps.find((s) => s.block === "market.fearGreed" || s.block === "market.globalMetrics");
    const id = mktStep?.id ?? "s1";
    marketMessage =
      mkt === "fearGreed"
        ? `📈 Fear & Greed alert (${hasCond ? "condition met" : "update"}). Index: \${${id}.value} (\${${id}.classification})`
        : `📈 Market alert (${hasCond ? "condition met" : "update"}). Market cap: \${${id}.totalMarketCap} · BTC dominance: \${${id}.btcDominance}%`;
  }
  const spec: AgentSpec = {
    name:
      needsMarket
        ? mkt === "fearGreed"
          ? "Market Sentiment Alert"
          : "Market Cap Monitor"
        : needsWallet && needsPrice
          ? `${token} Price + Balance Monitor`
          : needsWallet
            ? "Wallet Balance Monitor"
            : `${token} Price Alert`,
    trigger: { type: "interval", every },
    steps,
    actions: [
      {
        block: "notify.telegram",
        params: {
          message: needsMarket
            ? marketMessage
            : needsWallet && !needsPrice
              ? `🚨 Wallet balance alert (${hasCond ? "condition met" : "update"}). Balance: \${${balId}.balance}`
              : `⚠️ ${token} alert (${hasCond ? "condition met" : "update"}). Price: \${${priceId}.price}`,
        },
      },
    ],
    ...(missingFields.length ? { missingFields } : {}),
  };
  return AgentSpecSchema.parse(spec);
}

// ---------- Groq-based extractor (used when GROQ_API_KEY present) ----------
async function extractSpecWithGroq(transcript: string): Promise<AgentSpec> {
  const system = await fs.readFile(PROMPT_FILE, "utf8");

  const attempt = async (): Promise<AgentSpec> => {
    const text = await groqChat(
      [
        { role: "system" as const, content: system },
        { role: "user" as const, content: transcript },
      ],
      { json: true, maxTokens: 1500 }
    );
    return AgentSpecSchema.parse(JSON.parse(text));
  };

  try {
    return await attempt();
  } catch (e) {
    console.warn("Groq extract attempt 1 failed, retrying once…", e);
    return await attempt(); // retry once on validation failure / malformed JSON
  }
}

/**
 * Main entry: prefer Groq (accurate NLU), fall back to the rule-based
 * extractor so the app works offline / without an API key.
 */
export async function extractSpec(transcript: string): Promise<AgentSpec> {
  if (process.env.GROQ_API_KEY) {
    try {
      return await extractSpecWithGroq(transcript);
    } catch (e) {
      console.warn("Groq extraction failed, using local extractor:", e);
    }
  }
  return extractSpecLocal(transcript);
}

export { DEFAULT_TRIGGER };