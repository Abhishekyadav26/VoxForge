import { NextResponse } from "next/server";
import { z } from "zod";
import { extractSpec } from "@/lib/extractor";

const Body = z.object({ transcript: z.string().min(1) });

export async function POST(req: Request) {
  try {
    const { transcript } = Body.parse(await req.json());
    const spec = await extractSpec(transcript);
    return NextResponse.json({ success: true, data: spec });
  } catch (e: any) {
    console.error("extract-spec error:", e);
    return NextResponse.json({ success: false, error: e?.message ?? String(e) }, { status: 400 });
  }
}