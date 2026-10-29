import { CoinMarketCap } from "@coinmarketcap/sdk";

// Simple price cache (15-30s) to avoid rate limits.
const cache = new Map<
  string,
  {
    price: number;
    timestamp: string;
    percentChange1h?: number;
    percentChange24h?: number;
    percentChange7d?: number;
    at: number;
  }
>();
const TTL_MS = 20_000;

export interface PriceQuote {
  price: number;
  timestamp: string;
  /** Real 1h % change from CMC, when available (live runs). */
  percentChange1h?: number;
  /** Real 24h % change from CMC, when available. */
  percentChange24h?: number;
  /** Real 7d % change from CMC, when available. */
  percentChange7d?: number;
}

// Last-resort fallback when no COINMARKETCAP_API_KEY is set or the API fails.
const MOCK_PRICES: Record<string, number> = {
  SOL: 151.5,
  ETH: 2950,
  USDC: 1.0,
  BTC: 67000,
};

// Lazy client — only constructed when a key is present.
let cmcClient: CoinMarketCap | null | undefined;

function getCmc(): CoinMarketCap | null {
  if (cmcClient !== undefined) return cmcClient;
  const apiKey = process.env.COINMARKETCAP_API_KEY;
  cmcClient = apiKey ? new CoinMarketCap({ apiKey }) : null;
  return cmcClient;
}

/**
 * Current price of a token via the official CoinMarketCap Pro SDK
 * (GET /v3/cryptocurrency/quotes/latest, one quote per convert currency),
 * plus the real 1h/24h/7d percent changes so `condition.percentChange` can
 * evaluate against actual market movement instead of a fabricated value.
 * Falls back to mock data when no API key is set or the call fails.
 */
export async function getPrice(
  token: string,
  currency = "USD"
): Promise<PriceQuote> {
  const sym = token.toUpperCase();
  const conv = currency.toUpperCase();
  const key = `${sym}/${conv}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) {
    return {
      price: hit.price,
      timestamp: hit.timestamp,
      percentChange1h: hit.percentChange1h,
      percentChange24h: hit.percentChange24h,
      percentChange7d: hit.percentChange7d,
    };
  }

  const client = getCmc();
  if (client) {
    try {
      // SDK result unions throwOnError variants; cast to the shape we consume
      // (confirmed from the generated types: body.data is CryptoQuoteV3Dto[]).
      type CmcQuoteResult = {
        data?: {
          data?: Array<{
            symbol?: string;
            quote?: Array<{
              symbol?: string;
              price?: number;
              percent_change_1h?: number;
              percent_change_24h?: number;
              percent_change_7d?: number;
              last_updated?: string;
            }>;
          }>;
        };
        error?: unknown;
      };
      const { data, error } = (await client.api.cryptocurrency.quotesLatest({
        query: { symbol: sym, convert: conv },
      })) as CmcQuoteResult;
      if (error) {
        throw new Error(
          typeof error === "string" ? error : JSON.stringify(error).slice(0, 200)
        );
      }
      // The SDK returns the full response body: { data: CryptoQuoteV3Dto[], status }.
      // A symbol like SOL matches many dead projects (Solcoin 2014, Sola Token,
      // …) — prefer the entry that actually carries a real numeric quote.
      const entries = data?.data ?? [];
      const matches = entries.filter((d) => d.symbol?.toUpperCase() === sym);
      const entry =
        matches.find((d) =>
          d.quote?.some((q) => typeof q.price === "number" && q.price !== null)
        ) ?? matches[0] ?? undefined;
      const quote = entry?.quote?.find((q) => q.symbol?.toUpperCase() === conv);
      const price = quote?.price;
      if (typeof price !== "number") {
        throw new Error(`No CoinMarketCap quote found for ${sym} in ${conv}`);
      }
      const timestamp = quote?.last_updated ?? new Date().toISOString();
      const result: PriceQuote = {
        price,
        timestamp,
        percentChange1h: quote?.percent_change_1h,
        percentChange24h: quote?.percent_change_24h,
        percentChange7d: quote?.percent_change_7d,
      };
      cache.set(key, { ...result, at: Date.now() });
      return result;
    } catch (e) {
      console.warn(`[price] CoinMarketCap failed for ${key}, using fallback:`, e);
    }
  }

  const price = MOCK_PRICES[sym] ?? 100;
  const timestamp = new Date().toISOString();
  cache.set(key, { price, timestamp, at: Date.now() });
  return { price, timestamp };
}