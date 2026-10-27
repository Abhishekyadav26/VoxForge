import { listAgents } from "@/lib/db";
export const dynamic = "force-dynamic";
export default async function AgentsPage() {
  const agents = await listAgents();
  return (<main className="space-y-4"><h1 className="text-2xl font-bold">Agents ({agents.length})</h1>{agents.length === 0 && <p className="text-slate-400">No agents yet. <a href="/studio" className="underline">Create one in the Studio</a>.</p>}{agents.map((a) => (<a key={a.id} href={"/agents/" + a.id} className="block rounded border border-slate-700 p-4 hover:border-emerald-500"><div className="font-semibold">{a.name}</div><div className="text-xs text-slate-400">{a.id} · created {a.createdAt}{a.lastRun ? " · last run " + a.lastRun + (a.lastTriggered ? " (triggered)" : " (no trigger)") : ""}</div></a>))}</main>);
}
