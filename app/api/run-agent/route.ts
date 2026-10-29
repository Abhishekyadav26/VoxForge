import { NextResponse } from "next/server";
import { z } from "zod";
import { getAgent, saveRun, markAgentRun } from "@/lib/db";
import { runSpec } from "@/lib/interpreter";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
const Body = z.object({ agentId: z.string().min(1), dryRun: z.boolean().optional() });
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id)
      return NextResponse.json({ success: false, error: "Unauthorized. Please sign in." }, { status: 401 });
    const { agentId, dryRun } = Body.parse(await req.json());
    const agent = await getAgent(agentId, session.user.id);
    if (!agent) return NextResponse.json({ success: false, error: "Agent not found" }, { status: 404 });
    // Real run by default: actually sends the Telegram alert. The Studio's
    // dry-run trace goes through /api/test-spec instead (always dryRun: true).
    const result = await runSpec(agent.spec, { dryRun: dryRun ?? false });
    await markAgentRun(agentId, result.triggered, session.user.id);
    const run = await saveRun({ agentId, triggered: result.triggered, trace: result.trace, messages: result.messages }, session.user.id);
    return NextResponse.json({ success: true, data: { ...result, runId: run.id } });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message ?? String(e) }, { status: 400 });
  }
}
