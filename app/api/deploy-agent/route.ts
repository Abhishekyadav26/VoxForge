import { NextResponse } from "next/server";
import { AgentSpecSchema } from "@/lib/spec-schema";
import { saveAgent } from "@/lib/db";
export async function POST(req: Request) {
  try {
    const spec = AgentSpecSchema.parse((await req.json()).spec);
    const agent = await saveAgent(spec);
    return NextResponse.json({ success: true, data: agent });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message ?? String(e) }, { status: 400 });
  }
}
