import { getPrice } from "@/lib/blocks/price";
import { listAgents } from "@/lib/db";
import { Link } from "next-view-transitions";
import { NumberTicker } from "@/components/ui/number-ticker";
import { GlyphMatrix } from "@/components/ui/glyph-matrix";
import { TokenStatCard } from "@/components/TokenStatCard";
import { TiltCard } from "@/components/ui/be-ui-tilt-card";
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
            <TiltCard key={t.sym} className="w-full">
            <TokenStatCard
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
            </TiltCard>
          ))}
        </section>

        {/* ------------ HOW IT WORKS ------------ */}
        <section className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">How it works</p>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                n: "1",
                t: "Say what to watch",
                d: "Speak or type a rule in plain English, like “Alert me when SOL drops below $100.” The AI turns it into a checked monitor spec.",
                quote: "“Alert me when SOL drops below $100.”",
              },
              {
                n: "2",
                t: "Review the plan",
                d: "See each step as a graph. Click a step to change a number, then dry-run it against live CoinMarketCap prices.",
                quote: null,
              },
              {
                n: "3",
                t: "Get pinged on Telegram",
                d: "Deploy the agent. When the condition fires, the alert lands in your own Telegram chat.",
                quote: null,
              },
            ].map((s) => (
              <div
                key={s.n}
                className="flex flex-col rounded-xl border border-slate-800 bg-slate-900/60 p-5 transition-colors hover:border-slate-700"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-900">
                    {s.n}
                  </span>
                  <h3 className="font-semibold text-slate-100">{s.t}</h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">{s.d}</p>
                {s.quote && (
                  <p className="mt-4 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-[13px] italic text-slate-300">
                    {s.quote}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ------------ SAMPLE ALERT ------------ */}
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Example alert</p>
              <h2 className="mt-1 text-xl font-bold">What lands in your Telegram</h2>
            </div>
          </div>
          <div className="max-w-md rounded-2xl rounded-tl-sm border border-slate-700 bg-slate-900/70 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-sky-300">VoxForge Bot</p>
              <p className="text-[11px] text-slate-500">sample</p>
            </div>
            <p className="mt-2 text-[14px] leading-relaxed text-slate-100">
              ⚠️ SOL dropped below $100. Current: <strong>$98.42</strong>
            </p>
            <p className="mt-3 border-t border-slate-800 pt-2 font-mono text-[11.5px] text-slate-400">
              s1 · SOL = $98.42 → 98.42 &lt; 100 ✓ triggered
            </p>
          </div>
          <p className="text-sm text-slate-400">
            Link your Telegram from the studio and alerts go to your own chat, not a shared one.
          </p>
        </section>

        {/* ------------ CTA ------------ */}
        <section className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-10 text-center">
          <h2 className="text-2xl font-bold">Ready to build your first monitor?</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-300">
            Start with no keys. Speak a rule, review the plan, and dry-run it on live prices.
            Connect Telegram when you want real alerts.
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
