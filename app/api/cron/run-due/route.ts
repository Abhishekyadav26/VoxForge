import { NextResponse } from "next/server";
import { runDueAgents } from "@/lib/scheduler";

// Vercel cron calls this route with GET; the local scheduler uses POST.
// Both share one handler so the auth and behaviour stay identical.
// Running several agents sequentially can exceed the default 10s limit.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

async function handle(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ success: false, error: "CRON_SECRET not set" }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const outcomes = await runDueAgents();
    return NextResponse.json({ success: true, ran: outcomes.length, data: outcomes });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
