import { CoinMarketCap } from "@coinmarketcap/sdk";

// Simple price cache (15-30s) to avoid rate limits.
const cache = new Map<
  string,
  PriceQuote & { at: number }
>();
const TTL_MS = 20_000;

/**
 * Symbol → CoinMarketCap id. `cryptocurrency.map` returns every coin sharing a
 * ticker; the lowest rank (highest market cap) is the live one. Quoting by id
 * removes the dead-token ambiguity entirely, so SOL/Wrapped-Solana style
 * collisions can never return a penny token.
 */
const idCache = new Map<string, { id: number; name: string; at: number }>();
const ID_TTL_MS = 6 * 60 * 60 * 1000;

export interface PriceQuote {
  price: number;
  timestamp: string;
  /** Canonical CoinMarketCap id (resolved via cryptocurrency.map). */
  id?: number;
  name?: string;
  /** 24h traded volume in the quote currency, when CMC provides it. */
  volume24h?: number;
  marketCap?: number;
  /** Total value locked, when CMC provides it. */
  tvl?: number;
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

/** Resolve a ticker to its canonical CMC id (cached for 6h). Null if unknown. */
async function resolveId(sym: string): Promise<{ id: number; name: string } | null> {
  const hit = idCache.get(sym);
  if (hit && Date.now() - hit.at < ID_TTL_MS) return { id: hit.id, name: hit.name };
  const client = getCmc();
  if (!client) return null;
  try {
    const { data, error } = (await client.api.cryptocurrency.map({
      query: { symbol: sym },
    })) as {
      data?: { data?: Array<{ id?: number; name?: string; symbol?: string; rank?: number; is_active?: number }> };
      error?: unknown;
    };
    if (error) return null;
    const rows = (data?.data ?? []).filter(
      (r) => r.symbol?.toUpperCase() === sym && r.id && r.is_active !== 0
    );
    if (!rows.length) return null;
    // Lowest rank = highest market cap = the token people mean.
    rows.sort((a, b) => (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER));
    const best = { id: rows[0].id!, name: rows[0].name ?? sym };
    idCache.set(sym, { ...best, at: Date.now() });
    return best;
  } catch {
    return null; // fall back to symbol lookup
  }
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
    // Return the whole cached quote so volume/24h stats survive a cache hit.
    const { at: _at, ...quote } = hit;
    return quote;
  }

  const client = getCmc();
  if (client) {
    try {
      // SDK result unions throwOnError variants; cast to the shape we consume
      // (confirmed from the generated types: body.data is CryptoQuoteV3Dto[]).
      type CmcQuoteResult = {
        data?: {
          data?: Array<{
            id?: number;
            name?: string;
            symbol?: string;
            quote?: Array<{
              symbol?: string;
              price?: number;
              volume_24h?: number;
              market_cap?: number;
              tvl?: number;
              percent_change_1h?: number;
              percent_change_24h?: number;
              percent_change_7d?: number;
              last_updated?: string;
            }>;
          }>;
        };
        error?: unknown;
      };
      // Prefer the canonical id from cryptocurrency.map: quoting by id returns
      // exactly one coin, so ticker collisions can't select a dead token.
      const resolved = await resolveId(sym);
      const { data, error } = (await client.api.cryptocurrency.quotesLatest({
        query: resolved ? { id: String(resolved.id), convert: conv } : { symbol: sym, convert: conv },
      })) as CmcQuoteResult;
      if (error) {
        throw new Error(
          typeof error === "string" ? error : JSON.stringify(error).slice(0, 200)
        );
      }
      // The SDK returns the full response body: { data: CryptoQuoteV3Dto[], status }.
      // A symbol like SOL or JUP matches many dead projects (Solcoin 2014,
      // old Jupiter tokens, …) — among the matches that carry a real numeric
      // quote, pick the one with the highest market cap. That is the live
      // token (the real Jupiter has a $1B+ mcap; dead forks sit at pennies).
      const entries = data?.data ?? [];
      const matches = entries.filter((d) => d.symbol?.toUpperCase() === sym);
      const quoted = matches.filter((d) =>
        d.quote?.some((q) => typeof q.price === "number" && q.price !== null)
      );
      const entry = (quoted.length ? quoted : matches).sort((a, b) => {
        const mcapA =
          a.quote?.find((q) => q.symbol?.toUpperCase() === conv)?.market_cap ?? 0;
        const mcapB =
          b.quote?.find((q) => q.symbol?.toUpperCase() === conv)?.market_cap ?? 0;
        return mcapB - mcapA;
      })[0];
      const quote = entry?.quote?.find((q) => q.symbol?.toUpperCase() === conv);
      const price = quote?.price;
      if (typeof price !== "number") {
        throw new Error(`No CoinMarketCap quote found for ${sym} in ${conv}`);
      }
      const timestamp = quote?.last_updated ?? new Date().toISOString();
      const result: PriceQuote = {
        price,
        timestamp,
        id: entry?.id ?? resolved?.id,
        name: entry?.name ?? resolved?.name,
        volume24h: quote?.volume_24h,
        marketCap: quote?.market_cap,
        tvl: quote?.tvl,
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
export interface HistoricalPrice {
  price: number;
  timestamp: string;
  /** Hours back from now that was requested. */
  hoursAgo: number;
  symbol: string;
}

/**
 * Price at a point in the past (cryptocurrency.quotes/historical).
 * Enables "alert me when SOL returns to its price from 24h ago" and
 * moving-average style comparisons that percent_change can't express.
 */
export async function getHistoricalPrice(
  token: string,
  hoursAgo = 24,
  currency = "USD"
): Promise<HistoricalPrice> {
  const sym = token.toUpperCase();
  const conv = currency.toUpperCase();
  const resolved = await resolveId(sym);
  if (!resolved) throw new Error(`Unknown token "${token}" — is the ticker correct?`);
  const timeStart = new Date(Date.now() - hoursAgo * 3600_000).toISOString();

  const { data, error } = (await getCmc()!.api.cryptocurrency.quotesHistorical({
    query: { id: String(resolved.id), convert: conv, time_start: timeStart, count: 1 },
  })) as {
    data?: {
      data?: Record<
        string,
        { quotes?: Array<{ timestamp?: string; quote?: Record<string, { price?: number }> }> }
      >;
    };
    error?: unknown;
  };
  if (error) throw new Error(`CoinMarketCap historical failed for ${sym}`);

  const bucket = data?.data?.[String(resolved.id)];
  const point = bucket?.quotes?.[0];
  const price = point?.quote?.[conv]?.price;
  if (typeof price !== "number") {
    throw new Error(`No historical price for ${sym} ${hoursAgo}h ago`);
  }
  return { price, timestamp: point?.timestamp ?? timeStart, hoursAgo, symbol: sym };
}
