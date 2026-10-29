import { NextResponse } from "next/server";
import { AgentSpecSchema } from "@/lib/spec-schema";
import { saveAgent } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id)
      return NextResponse.json({ success: false, error: "Unauthorized. Please sign in." }, { status: 401 });
    const spec = AgentSpecSchema.parse((await req.json()).spec);
    const agent = await saveAgent(spec, session.user.id);
    return NextResponse.json({ success: true, data: agent });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message ?? String(e) }, { status: 400 });
  }
}
