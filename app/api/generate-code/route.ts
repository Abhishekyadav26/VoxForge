import { NextResponse } from "next/server";
import { AgentSpecSchema } from "@/lib/spec-schema";
import { generateCodeBestEffort } from "@/lib/generator";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id)
      return NextResponse.json({ success: false, error: "Unauthorized. Please sign in." }, { status: 401 });

    const spec = AgentSpecSchema.parse((await req.json()).spec);
    const code = await generateCodeBestEffort(spec);
    return NextResponse.json({ success: true, data: { code } });
  } catch (e: any) {
    console.error("generate-code error:", e);
    return NextResponse.json({ success: false, error: e?.message ?? String(e) }, { status: 400 });
  }
}