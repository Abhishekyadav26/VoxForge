import { NextResponse } from "next/server";
import { z } from "zod";
import { getAgent, saveRun, markAgentRun } from "@/lib/db";
import { runSpec } from "@/lib/interpreter";
const Body = z.object({ agentId: z.string().min(1), dryRun: z.boolean().optional() });
export async function POST(req: Request) {
  try {
    const { agentId, dryRun } = Body.parse(await req.json());
    const agent = await getAgent(agentId);
    if (!agent) return NextResponse.json({ success: false, error: "Agent not found" }, { status: 404 });
    const result = await runSpec(agent.spec, { dryRun: dryRun ?? true });
    await markAgentRun(agentId, result.triggered);
    const run = await saveRun({ agentId, triggered: result.triggered, trace: result.trace, messages: result.messages });
    return NextResponse.json({ success: true, data: { ...result, runId: run.id } });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message ?? String(e) }, { status: 400 });
  }
}
