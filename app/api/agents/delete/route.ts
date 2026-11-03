import { NextResponse } from "next/server";
import { deleteAgent, getAgent } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/** Delete an agent (and its run history): POST { agentId }. */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ success: false, error: "Unauthorized. Please sign in." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const agentId = body.agentId as string | undefined;
  if (!agentId)
    return NextResponse.json({ success: false, error: "agentId is required." }, { status: 400 });
  const agent = await getAgent(agentId, session.user.id);
  if (!agent)
    return NextResponse.json({ success: false, error: "Agent not found." }, { status: 404 });
  await deleteAgent(agentId, session.user.id);
  return NextResponse.json({ success: true, data: { id: agentId } });
}
