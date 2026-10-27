import { getAgent, listRuns } from "@/lib/db";
import RunButton from "@/components/RunButton";
export const dynamic = "force-dynamic";
export default async function AgentDetail({ params }: { params: { id: string } }) {
  const agent = await getAgent(params.id);
  if (!agent) return <main><p>Agent not found.</p><a href="/agents" className="underline">Back</a></main>;
  const runs = await listRuns(agent.id);
  return (<main className="space-y-4"><h1 className="text-2xl font-bold">{agent.name}</h1><RunButton agentId={agent.id} /><pre className="overflow-auto rounded bg-slate-900 p-4 text-xs">{JSON.stringify(agent.spec, null, 2)}</pre><h2 className="text-lg font-semibold">Runs ({runs.length})</h2>{runs.map((r) => (<div key={r.id} className="rounded border border-slate-700 p-3 text-sm"><div>{r.executedAt} — {r.triggered ? "🔔 triggered" : "no trigger"}</div><pre className="mt-2 overflow-auto text-xs text-slate-300">{JSON.stringify(r.trace, null, 2)}</pre></div>))}</main>);
}
