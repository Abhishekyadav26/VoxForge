import { NextResponse } from "next/server";
import { AgentSpecSchema } from "@/lib/spec-schema";
import { runSpec } from "@/lib/interpreter";
export async function POST(req: Request) {
  try {
    const spec = AgentSpecSchema.parse((await req.json()).spec);
    const result = await runSpec(spec, { dryRun: true });
    return NextResponse.json({ success: true, data: result });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message ?? String(e) }, { status: 400 });
  }
}
