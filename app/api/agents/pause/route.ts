import { NextResponse } from "next/server";
import { getAgent, setAgentPaused } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/** Pause or resume an agent: POST { agentId, paused }. */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ success: false, error: "Unauthorized. Please sign in." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const agentId = body.agentId as string | undefined;
  const paused = body.paused as boolean | undefined;
  if (!agentId || typeof paused !== "boolean")
    return NextResponse.json({ success: false, error: "agentId and paused (boolean) are required." }, { status: 400 });
  const agent = await getAgent(agentId, session.user.id);
  if (!agent)
    return NextResponse.json({ success: false, error: "Agent not found." }, { status: 404 });
  await setAgentPaused(agentId, paused, session.user.id);
  return NextResponse.json({ success: true, data: { id: agentId, paused } });
}
