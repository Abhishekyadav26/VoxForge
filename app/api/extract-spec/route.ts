import { NextResponse } from "next/server";
import { z } from "zod";
import { extractSpec } from "@/lib/extractor";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const Body = z.object({ transcript: z.string().min(1) });

export async function POST(req: Request) {
  try {
    // Re-check the session here too: middleware only sees the JWT, so a token
    // invalidated by a password change (session_version bump) is caught here.
    const session = await getServerSession(authOptions);
    if (!session?.user?.id)
      return NextResponse.json({ success: false, error: "Unauthorized. Please sign in." }, { status: 401 });

    const { transcript } = Body.parse(await req.json());
    const spec = await extractSpec(transcript);
    return NextResponse.json({ success: true, data: spec });
  } catch (e: any) {
    console.error("extract-spec error:", e);
    return NextResponse.json({ success: false, error: e?.message ?? String(e) }, { status: 400 });
  }
}