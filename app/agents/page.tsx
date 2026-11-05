import { listAgents } from "@/lib/db";
import { Link } from "next-view-transitions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { fmtDate } from "@/lib/format-date";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const agents = await listAgents(session.user.id);
  return (
    <main className="mx-auto max-w-5xl space-y-4 px-4 pb-16 pt-20">
      <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
        Agents ({agents.length})
      </h1>
      {agents.length === 0 && (
        <p className="text-slate-400">
          No agents yet.{" "}
          <Link href="/studio" className="inline-block py-1 underline">
            Create one in the Studio
          </Link>
          .
        </p>
      )}
      {agents.map((a) => (
        <Link
          key={a.id}
          href={"/agents/" + a.id}
          className="group flex flex-wrap items-center gap-x-2.5 gap-y-1.5 rounded-2xl border border-white/[0.08] bg-[#151517] p-4 transition-colors duration-150 hover:border-slate-600 hover:bg-slate-900 sm:p-5"
          style={
            { viewTransitionName: "agent-card-" + a.id, viewTransitionClass: "agent-card" } as React.CSSProperties
          }
        >
          <div className="min-w-0 break-words text-[15px] font-semibold text-slate-100">{a.name}</div>
          {/* Status as a small dot + word (Vibrant ref: Edge Infrastructure Dashboard) */}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[11px] font-medium text-slate-300">
            <span
              aria-hidden
              className={
                "h-1.5 w-1.5 rounded-full " +
                (a.lastTriggered
                  ? "bg-emerald-400"
                  : a.lastRun
                    ? "bg-slate-400"
                    : "border border-slate-500 bg-transparent")
              }
            />
            {a.lastTriggered ? "triggered" : a.lastRun ? "quiet" : "new"}
          </span>
          <div className="w-full text-xs text-slate-400">
            <span className="text-slate-500">created</span> {fmtDate(a.createdAt)}
            {a.lastRun ? <> · <span className="text-slate-500">last run</span> {fmtDate(a.lastRun)}</> : null}
            {a.paused ? (
              <>
                {" · "}
                <span className="whitespace-nowrap">⏸ paused</span>
              </>
            ) : null}
          </div>
        </Link>
      ))}
    </main>
  );
}