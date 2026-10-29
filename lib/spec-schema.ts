import { z } from "zod";

// ---- Step blocks ----
export const PriceGetParams = z.object({
  token: z.string().min(1).transform((s) => s.toUpperCase()),
  currency: z.enum(["USD", "EUR", "INR"]).default("USD"),
});
export const FearGreedParams = z.object({}).default({});
export const GlobalMetricsParams = z.object({
  currency: z.enum(["USD", "EUR", "INR"]).default("USD"),
});
export const WalletBalanceParams = z.object({
  chain: z.string().default("solana"),
  address: z.string().min(1),
});
export const ConditionCompareParams = z.object({
  left: z.string().min(1), // e.g. "s1.price"
  op: z.enum(["<", ">", "<=", ">=", "=="]),
  right: z.number(),
});
export const ConditionPercentChangeParams = z.object({
  value: z.string().min(1), // e.g. "s1.price" or "s1.balance"
  percentChange: z.number(),
  timeWindow: z.string().default("1h"), // "1h" | "5m" ...
});

export const StepSchema = z.object({
  id: z.string().min(1),
  block: z.enum([
    "price.get",
    "wallet.getBalance",
    "market.fearGreed",
    "market.globalMetrics",
    "condition.compare",
    "condition.percentChange",
  ]),
  params: z.record(z.any()),
});

export const ActionSchema = z.object({
  block: z.literal("notify.telegram"),
  params: z.object({ message: z.string().min(1) }),
});

export const TriggerSchema = z.object({
  type: z.enum(["interval", "webhook", "event"]),
  every: z.string().optional(), // "60s" | "5m" | "1h" ...
});

export const AgentSpecSchema = z.object({
  name: z.string().min(1),
  trigger: TriggerSchema,
  steps: z.array(StepSchema).min(1).max(10),
  actions: z.array(ActionSchema).min(1),
  missingFields: z.array(z.string()).optional(),
});

export type AgentSpec = z.infer<typeof AgentSpecSchema>;

/** Validate a Solana-ish address (base58, 32-44 chars). Allows placeholder. */
export function isValidAddress(addr: string): boolean {
  if (addr === "MISSING_WALLET_ADDRESS") return false;
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr);
}

export function isValidToken(token: string): boolean {
  return /^[A-Z0-9]{2,12}$/.test(token.toUpperCase());
}
