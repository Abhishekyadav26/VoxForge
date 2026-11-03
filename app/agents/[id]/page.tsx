import { getAgent, listRuns } from "@/lib/db";
import RunButton from "@/components/RunButton";
import RunRow from "@/components/RunRow";
import SpecSummary from "@/components/SpecSummary";
import { fmtDate } from "@/lib/format-date";
import { Link } from "next-view-transitions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AgentDetail({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const agent = await getAgent(params.id, session.user.id);
  if (!agent)
    return (
      <main className="mx-auto max-w-5xl space-y-4 px-4 pt-20">
        <p>Agent not found.</p>
        <Link href="/agents" className="underline">
          Back
        </Link>
      </main>
    );
  const runs = await listRuns(agent.id, session.user.id);
  const last = runs[0];
  return (
    <main className="mx-auto max-w-5xl space-y-4 px-4 pt-20">
      <Link href="/agents" className="inline-flex min-h-[24px] items-center text-sm text-slate-400 hover:text-white">
        ← Agents
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <h1
          className="text-2xl font-bold"
          style={
            { viewTransitionName: "agent-card-" + params.id, viewTransitionClass: "agent-card" } as React.CSSProperties
          }
        >
          {agent.name}
        </h1>
        <span
          className={
            "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold " +
            (last?.triggered
              ? "border-emerald-800 bg-emerald-950/60 text-emerald-200"
              : "border-slate-700 bg-slate-900 text-slate-300")
          }
        >
          {last ? (last.triggered ? "● last run triggered" : "○ last run quiet") : "○ never run"}
        </span>
      </div>
      <RunButton agentId={agent.id} />
      {/* ux-visual C2: human summary first; raw JSON one click away */}
      <SpecSummary spec={agent.spec} />
      <details className="rounded border border-slate-800 bg-slate-900/40 px-3 py-2 text-xs text-slate-400">
        <summary className="cursor-pointer select-none py-1 hover:text-slate-200">Developer: raw spec JSON</summary>
        <pre className="overflow-auto p-2 font-mono">
          {JSON.stringify(agent.spec, null, 2)}
        </pre>
      </details>
      <h2 className="text-lg font-semibold">
        Runs ({runs.length})
        {runs.length > 0 && <span className="ml-2 text-xs font-normal text-slate-400">last {fmtDate(last.executedAt)}</span>}
      </h2>
      <div className="space-y-2">
        {runs.map((r) => (
          <RunRow key={r.id} run={r} />
        ))}
      </div>
    </main>
  );
}