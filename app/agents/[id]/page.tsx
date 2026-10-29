import { getAgent, listRuns } from "@/lib/db";
import RunButton from "@/components/RunButton";
import AnimatedRuns from "@/components/AnimatedRuns";
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
  return (
    <main className="mx-auto max-w-5xl space-y-4 px-4 pt-20">
      <Link href="/agents" className="vt-back text-sm text-slate-400 hover:text-white">
        ← Agents
      </Link>
      <h1
        className="text-2xl font-bold"
        style={
          { viewTransitionName: "agent-card-" + params.id, viewTransitionClass: "agent-card" } as React.CSSProperties
        }
      >
        {agent.name}
      </h1>
      <RunButton agentId={agent.id} />
      <pre className="overflow-auto rounded bg-slate-900 p-4 text-xs">
        {JSON.stringify(agent.spec, null, 2)}
      </pre>
      <h2 className="text-lg font-semibold">Runs ({runs.length})</h2>
      <AnimatedRuns runs={runs} />
    </main>
  );
}