import { CoinMarketCap } from "@coinmarketcap/sdk";

// Simple cache (60s) to avoid rate limits.
const cache = new Map<string, { data: unknown; at: number }>();
const TTL_MS = 60_000;

// Last-resort fallback when no COINMARKETCAP_API_KEY is set or the API fails.
const MOCK_FEAR_GREED = { value: 55, value_classification: "Neutral" };
const MOCK_GLOBAL_METRICS = {
  total_market_cap: 2_400_000_000_000,
  total_volume_24h: 82_000_000_000,
  btc_dominance: 56.4,
  eth_dominance: 13.2,
  active_cryptocurrencies: 14800,
};

// Lazy client — only constructed when a key is present.
let cmcClient: CoinMarketCap | null | undefined;

function getCmc(): CoinMarketCap | null {
  if (cmcClient !== undefined) return cmcClient;
  const apiKey = process.env.COINMARKETCAP_API_KEY;
  cmcClient = apiKey ? new CoinMarketCap({ apiKey }) : null;
  return cmcClient;
}

async function cached<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data as T;
  const data = await fetchFn();
  cache.set(key, { data, at: Date.now() });
  return data;
}

export interface FearGreedResult {
  value: number; // 0-100
  classification: string; // "Extreme Fear" | "Fear" | "Neutral" | "Greed" | "Extreme Greed"
  timestamp: string;
}

/**
 * Current CMC Fear & Greed index (GET /v3/fear-and-greed/latest).
 * Falls back to mock data when no API key is set or the call fails.
 */
export async function getFearGreed(): Promise<FearGreedResult> {
  return cached("fear-greed", async () => {
    const client = getCmc();
    if (client) {
      try {
        type CmcFearGreedResult = {
          data?: { data?: { value?: number; value_classification?: string; update_time?: string } };
          error?: unknown;
        };
        const { data, error } = (await client.api.globalMetrics.fearandgreedLatest(
          {}
        )) as CmcFearGreedResult;
        if (error) {
          throw new Error(
            typeof error === "string" ? error : JSON.stringify(error).slice(0, 200)
          );
        }
        const inner = data?.data;
        const value = inner?.value;
        if (typeof value !== "number") {
          throw new Error("No Fear & Greed value returned by CoinMarketCap");
        }
        return {
          value,
          classification: inner?.value_classification ?? "Unknown",
          timestamp: inner?.update_time ?? new Date().toISOString(),
        };
      } catch (e) {
        console.warn("[market] Fear & Greed failed, using fallback:", e);
      }
    }
    return {
      value: MOCK_FEAR_GREED.value,
      classification: MOCK_FEAR_GREED.value_classification,
      timestamp: new Date().toISOString(),
    };
  });
}

export interface GlobalMetricsResult {
  totalMarketCap: number;
  totalVolume24h: number;
  btcDominance: number;
  ethDominance: number;
  activeCryptocurrencies: number;
  timestamp: string;
}

/**
 * Latest global market metrics (GET /v1/global-metrics/quotes/latest):
 * total market cap, 24h volume, BTC/ETH dominance.
 * Falls back to mock data when no API key is set or the call fails.
 */
export async function getGlobalMetrics(currency = "USD"): Promise<GlobalMetricsResult> {
  const conv = currency.toUpperCase();
  return cached(`global-metrics/${conv}`, async () => {
    const client = getCmc();
    if (client) {
      try {
        type CmcGlobalMetricsResult = {
          data?: {
            data?: {
              btc_dominance?: number;
              eth_dominance?: number;
              active_cryptocurrencies?: number;
              quote?: Record<string, { total_market_cap?: number; total_volume_24h?: number; last_updated?: string }>;
            };
          };
          error?: unknown;
        };
        const { data, error } = (await client.api.globalMetrics.quotesLatest({
          query: { convert: conv },
        })) as CmcGlobalMetricsResult;
        if (error) {
          throw new Error(
            typeof error === "string" ? error : JSON.stringify(error).slice(0, 200)
          );
        }
        const inner = data?.data;
        const q = inner?.quote?.[conv];
        const totalMarketCap = q?.total_market_cap;
        if (typeof totalMarketCap !== "number") {
          throw new Error("No global metrics returned by CoinMarketCap");
        }
        return {
          totalMarketCap,
          totalVolume24h: q?.total_volume_24h ?? 0,
          btcDominance: inner?.btc_dominance ?? 0,
          ethDominance: inner?.eth_dominance ?? 0,
          activeCryptocurrencies: inner?.active_cryptocurrencies ?? 0,
          timestamp: q?.last_updated ?? new Date().toISOString(),
        };
      } catch (e) {
        console.warn("[market] global metrics failed, using fallback:", e);
      }
    }
    return {
      totalMarketCap: MOCK_GLOBAL_METRICS.total_market_cap,
      totalVolume24h: MOCK_GLOBAL_METRICS.total_volume_24h,
      btcDominance: MOCK_GLOBAL_METRICS.btc_dominance,
      ethDominance: MOCK_GLOBAL_METRICS.eth_dominance,
      activeCryptocurrencies: MOCK_GLOBAL_METRICS.active_cryptocurrencies,
      timestamp: new Date().toISOString(),
    };
  });
}

/** Compact $/M formatting for market-cap style numbers. */
export function formatUsd(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toFixed(0)}`;
}