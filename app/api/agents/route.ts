import { NextResponse } from "next/server";
import { listAgents } from "@/lib/db";

export const dynamic = "force-dynamic"; // never cache: agents are stored on disk

export async function GET() {
  return NextResponse.json({ success: true, data: await listAgents() });
}
