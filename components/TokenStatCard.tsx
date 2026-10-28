"use client";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export interface TokenStatCardProps {
  /** Token symbol, e.g. "SOL" */
  ticker: string;
  /** Full name, e.g. "Solana" */
  name: string;
  /** Current price in `currency` */
  currentPrice: number;
  currency?: string;
  /** Change vs the alert threshold / window, in percent (signed) */
  percentageChange?: number;
  /** Green when the condition is NOT met (safe), red when triggered */
  triggered?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const NAMES: Record<string, string> = {
  SOL: "Solana",
  ETH: "Ethereum",
  BTC: "Bitcoin",
  USDC: "USD Coin",
  JUP: "Jupiter",
  BONK: "Bonk",
};

function formatCurrency(value: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: value < 10 ? 4 : 2,
  }).format(value);
}

/**
 * Adapted from 21st.dev Asset Card (ravikatiyar162/asset-card, id 7945).
 * Two-panel layout: gradient status panel (left) + data panel (right),
 * framer-motion hover lift. `triggered=false` = neutral (safe), `true` = red.
 */
export function TokenStatCard({
  ticker,
  name,
  currentPrice,
  currency = "USD",
  percentageChange,
  triggered = false,
  className,
  children,
}: TokenStatCardProps) {
  const sym = ticker.toUpperCase();
  const displayName = name || NAMES[sym] || sym;
  const pct = percentageChange ?? 0;
  const isPositive = pct >= 0;

  return (
    <motion.div
      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
      className={cn(
        "flex w-full max-w-xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-lg",
        className
      )}
    >
      {/* Left panel — status gradient */}
      <div
        className={cn(
          "flex w-2/5 flex-col justify-between bg-gradient-to-br p-4 text-white",
          triggered ? "from-slate-600" : "from-slate-600",
          triggered ? "to-slate-900" : "to-slate-900"
        )}
      >
        {/* Token monogram */}
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-sm font-bold backdrop-blur-sm">
          {sym.slice(0, 3)}
        </div>
        <div>
          {percentageChange !== undefined && (
            <p className="text-3xl font-bold">
              {isPositive ? "+" : ""}
              {pct.toFixed(2)}%
            </p>
          )}
          <p className="text-sm opacity-80">{formatCurrency(currentPrice, currency)}</p>
        </div>
      </div>

      {/* Right panel — data */}
      <div className="flex w-3/5 flex-col justify-between bg-slate-900 p-4 text-slate-100">
        <div>
          <div className="flex items-center justify-between">
            <p className="text-xl font-bold tracking-tight">
              {displayName} <span className="text-slate-400">/ {sym}</span>
            </p>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-semibold",
                triggered
                  ? "bg-slate-500/20 text-slate-200"
                  : "bg-slate-500/20 text-slate-200"
              )}
            >
              {triggered ? "would fire" : "✓ safe"}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400">Live price via CoinMarketCap</p>
        </div>
        {children && <div className="mt-3">{children}</div>}
      </div>
    </motion.div>
  );
}
