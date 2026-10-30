import { NextResponse } from "next/server";
import { AgentSpecSchema } from "@/lib/spec-schema";
import { saveAgent } from "@/lib/db";
import { sendDeployConfirmation, executeAgent } from "@/lib/scheduler";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id)
      return NextResponse.json({ success: false, error: "Unauthorized. Please sign in." }, { status: 401 });
    const spec = AgentSpecSchema.parse((await req.json()).spec);
    const agent = await saveAgent(spec, session.user.id);
    // Confirm in Telegram right away. A failed send must not fail the deploy.
    try {
      await sendDeployConfirmation(agent);
    } catch (e) {
      console.warn("[deploy] confirmation alert failed:", (e as Error).message);
    }
    // Automate the first run: execute the agent immediately, like pressing
    // "Run now" on its page. Uses the shared runner (real send when triggered,
    // run record saved) so the agent page shows the run without a manual click.
    let run: import("@/lib/scheduler").RunOutcome | null = null;
    try {
      run = await executeAgent(agent);
    } catch (e) {
      console.warn("[deploy] first run failed:", (e as Error).message);
    }
    return NextResponse.json({ success: true, data: { ...agent, run } });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message ?? String(e) }, { status: 400 });
  }
}
