// Simple price cache (15-30s) to avoid rate limits.
const cache = new Map<string, { price: number; at: number }>();
const TTL_MS = 20_000;

// Mock prices for dry-run / no-key mode. Real wiring: Jupiter/Helius.
const MOCK_PRICES: Record<string, number> = {
  SOL: 151.5,
  ETH: 2950,
  USDC: 1.0,
  BTC: 67000,
};

export async function getPrice(
  token: string,
  currency = "USD"
): Promise<{ price: number; timestamp: string }> {
  const sym = token.toUpperCase();
  const key = `${sym}/${currency}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) {
    return { price: hit.price, timestamp: new Date().toISOString() };
  }
  // TODO: wire Jupiter price API here when HELIUS/Jupiter keys present.
  const price = MOCK_PRICES[sym] ?? 100;
  cache.set(key, { price, at: Date.now() });
  return { price, timestamp: new Date().toISOString() };
}
