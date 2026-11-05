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
    <main className="mx-auto max-w-5xl space-y-4 px-4 pt-20">
      <h1 className="text-2xl font-bold">
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
          className="flex flex-wrap items-center gap-2 rounded border border-slate-700 p-4 hover:border-slate-300"
          style={
            { viewTransitionName: "agent-card-" + a.id, viewTransitionClass: "agent-card" } as React.CSSProperties
          }
        >
          <div className="min-w-0 break-words font-semibold">{a.name}</div>
          <span
            className={
              "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold " +
              (a.lastTriggered
                ? "border-emerald-800 bg-emerald-950/60 text-emerald-200"
                : "border-slate-700 bg-slate-900 text-slate-300")
            }
          >
            {a.lastRun ? (a.lastTriggered ? "● triggered" : "○ quiet") : "○ new"}
          </span>
          <div className="w-full text-xs text-slate-400">
            created {fmtDate(a.createdAt)}
            {a.lastRun ? " · last run " + fmtDate(a.lastRun) : ""}
            {a.paused ? " · ⏸ paused" : ""}
          </div>
        </Link>
      ))}
    </main>
  );
}