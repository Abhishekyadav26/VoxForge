import { NextResponse } from "next/server";
import { AgentSpecSchema } from "@/lib/spec-schema";
import { generateCodeBestEffort } from "@/lib/generator";

export async function POST(req: Request) {
  try {
    const spec = AgentSpecSchema.parse((await req.json()).spec);
    const code = await generateCodeBestEffort(spec);
    return NextResponse.json({ success: true, data: { code } });
  } catch (e: any) {
    console.error("generate-code error:", e);
    return NextResponse.json({ success: false, error: e?.message ?? String(e) }, { status: 400 });
  }
}