import { listAgents } from "@/lib/db";
import { Link } from "next-view-transitions";
import { GlyphMatrix } from "@/components/ui/glyph-matrix";
import HomeHero from "@/components/HomeHero";
import HomeFeatures from "@/components/HomeFeatures";
import { Button } from "@/components/ui/button";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getServerSession(authOptions);
  const agents = await listAgents(session?.user?.id);

  return (
    <>
      {/* Full-screen hero (floating nav overlays it) */}
      <HomeHero />

      {/* Features bento, same hatched full-bleed language as the hero */}
      <HomeFeatures />

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
