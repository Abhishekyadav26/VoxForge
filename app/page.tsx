import { getPrice } from "@/lib/blocks/price";
import { listAgents } from "@/lib/db";
import { Link } from "next-view-transitions";
import { NumberTicker } from "@/components/ui/number-ticker";
import { TokenStatCard } from "@/components/TokenStatCard";
import HomeHero from "@/components/HomeHero";
import HomeFeatures from "@/components/HomeFeatures";

export const dynamic = "force-dynamic";

/** Fetch the headline prices for the live strip (CoinMarketCap, mock fallback). */
async function getHeadlinePrices() {
  const out: Record<string, number> = {};
  for (const t of ["SOL", "ETH", "BTC"] as const) {
    try {
      out[t] = (await getPrice(t, "USD")).price;
    } catch {
      out[t] = 0;
    }
  }
  return out;
}

export default async function Home() {
  const [prices, agents] = await Promise.all([getHeadlinePrices(), listAgents()]);

  return (
    <>
      {/* Full-screen hero (floating nav overlays it) */}
      <HomeHero />

      {/* Features bento, same hatched full-bleed language as the hero */}
      <HomeFeatures />

      <main className="mx-auto max-w-5xl px-4 pb-16">
        {/* ------------ LIVE STRIP ------------ */}
        <section className="grid gap-4 sm:grid-cols-3">
          {([
            { sym: "SOL", name: "Solana", price: prices.SOL },
            { sym: "ETH", name: "Ethereum", price: prices.ETH },
            { sym: "BTC", name: "Bitcoin", price: prices.BTC },
          ]).map((t) => (
            <TokenStatCard
              key={t.sym}
              ticker={t.sym}
              name={t.name}
              currentPrice={t.price}
              triggered={false}
            >
              <span className="flex items-baseline gap-2 text-sm text-slate-400">
                Live now:
                <span className="text-2xl font-bold tracking-tight text-emerald-400 [&_span]:!text-emerald-400">
                  $<NumberTicker value={t.price} decimalPlaces={2} />
                </span>
              </span>
            </TokenStatCard>
          ))}
        </section>

        {/* ------------ HOW IT WORKS ------------ */}
        <section className="grid gap-4 sm:grid-cols-3">
          {[
            { n: "1", t: "Speak or type", d: "“Alert me when SOL drops below $100, every 5 minutes.” Groq turns words into a validated AgentSpec — or the offline rules do." },
            { n: "2", t: "Review & dry-run", d: "The plan graph shows steps → conditions → Telegram action. Click any node to edit, then trace it against live CoinMarketCap prices." },
            { n: "3", t: "Deploy & get pinged", d: "Save the agent, run it on demand, and the notify.telegram block sends a real alert to your chat when conditions fire." },
          ].map((s) => (
            <div key={s.n} className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-bold text-emerald-400">
                {s.n}
              </div>
              <h3 className="font-semibold">{s.t}</h3>
              <p className="mt-1 text-sm text-slate-400">{s.d}</p>
            </div>
          ))}
        </section>

        {/* ------------ SAMPLE ALERT ------------ */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold">What an alert looks like</h2>
          <div className="max-w-md rounded-xl border border-emerald-700 bg-emerald-950/40 p-4 text-sm">
            <p className="font-semibold text-emerald-300">📨 Voice-to-Agent Studio</p>
            <p className="mt-2 text-slate-200">
              ⚠️ SOL alert (condition met). Price: <strong>$98.42</strong>
              <br />
              <span className="text-slate-400">s1: SOL = $98.42 · 98.42 &lt; 100? YES → fired</span>
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Delivered to Telegram via <code>notify.telegram</code> — try it with your own chat ID in <code>.env.local</code>.
            </p>
          </div>
        </section>

        {/* ------------ CTA ------------ */}
        <section className="rounded-2xl border border-emerald-800 bg-gradient-to-br from-emerald-950 to-slate-900 p-10 text-center">
          <h2 className="text-2xl font-bold">Ready to build your first monitor?</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-300">
            No keys required to start — speak, see the plan, dry-run against fallback prices.
            Add CoinMarketCap + Groq + Telegram keys when you're ready for live fire.
          </p>
          <Link
            href="/studio"
            className="mt-6 inline-block rounded-lg bg-emerald-500 px-8 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400"
          >
            Start building →
          </Link>
        </section>
      </main>
    </>
  );
}
