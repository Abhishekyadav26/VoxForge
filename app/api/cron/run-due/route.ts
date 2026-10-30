import { NextResponse } from "next/server";
import { runDueAgents } from "@/lib/scheduler";

/**
 * Scheduler tick: runs every interval-based agent that is due.
 * Protected by CRON_SECRET (Authorization: Bearer <secret>), so only the
 * scheduler can call it. Called once a minute by scripts/scheduler.ts.
 */
export async function POST(req: Request) {
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
