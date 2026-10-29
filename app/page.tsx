import { getPrice } from "@/lib/blocks/price";
import { listAgents } from "@/lib/db";
import { Link } from "next-view-transitions";
import { NumberTicker } from "@/components/ui/number-ticker";
import { GlyphMatrix } from "@/components/ui/glyph-matrix";
import { TokenStatCard } from "@/components/TokenStatCard";
import HomeHero from "@/components/HomeHero";
import HomeFeatures from "@/components/HomeFeatures";
import { Button } from "@/components/ui/button";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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
  const session = await getServerSession(authOptions);
  const [prices, agents] = await Promise.all([
    getHeadlinePrices(),
    listAgents(session?.user?.id),
  ]);

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
                <span className="text-2xl font-bold tracking-tight text-slate-100 [&_span]:!text-slate-100">
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
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100/10 text-sm font-bold text-slate-100">
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
          <div className="max-w-md rounded-xl border border-slate-600 bg-slate-900/60 p-4 text-sm">
            <p className="font-semibold text-slate-200">Voice-to-Agent Studio</p>
            <p className="mt-2 text-slate-200">
              SOL alert (condition met). Price: <strong>$98.42</strong>
              <br />
              <span className="text-slate-400">s1: SOL = $98.42 · 98.42 &lt; 100? YES → fired</span>
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Delivered to Telegram via <code>notify.telegram</code> — try it with your own chat ID in <code>.env.local</code>.
            </p>
          </div>
        </section>

        {/* ------------ CTA ------------ */}
        <section className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-10 text-center">
          <h2 className="text-2xl font-bold">Ready to build your first monitor?</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-300">
            No keys required to start — speak, see the plan, dry-run against fallback prices.
            Add CoinMarketCap + Groq + Telegram keys when you're ready for live fire.
          </p>
          <Button asChild className="mt-6">
            <Link href="/studio">
              Start building →
            </Link>
          </Button>
        </section>
      </main>

      {/* ------------ END PAGE: glyph matrix ------------ */}
      <section className="relative grid min-h-[70vh] place-items-center overflow-hidden border-t border-slate-800 bg-slate-950">
        <GlyphMatrix
          className="absolute inset-0"
          color="#8d8d8d"
          cellSize={18}
          mutationRate={0.05}
          interval={80}
          fadeBottom={0.4}
        />
        <div className="relative mx-auto max-w-3xl px-4 py-24 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-300">
            Built with Voice-to-Agent Studio
          </p>
          <h2 className="text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
            The matrix is watching SOL …
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm text-slate-300">
            No keys required to start — speak, see the plan, dry-run against fallback prices.
            Add CoinMarketCap + Groq + Telegram keys when you're ready for live fire.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link href="/studio">Start building →</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/agents">View agents {agents.length > 0 && `(${agents.length})`}</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
