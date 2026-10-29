import { listAgents } from "@/lib/db";
import { Link } from "next-view-transitions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

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
          <Link href="/studio" className="underline">
            Create one in the Studio
          </Link>
          .
        </p>
      )}
      {agents.map((a) => (
        <Link
          key={a.id}
          href={"/agents/" + a.id}
          className="block rounded border border-slate-700 p-4 hover:border-slate-300"
          style={
            { viewTransitionName: "agent-card-" + a.id, viewTransitionClass: "agent-card" } as React.CSSProperties
          }
        >
          <div className="font-semibold">{a.name}</div>
          <div className="text-xs text-slate-400">
            {a.id} · created {a.createdAt}
            {a.lastRun
              ? " · last run " + a.lastRun + (a.lastTriggered ? " (triggered)" : " (no trigger)")
              : ""}
          </div>
        </Link>
      ))}
    </main>
  );
}