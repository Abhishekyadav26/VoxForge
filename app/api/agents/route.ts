import { NextResponse } from "next/server";
import { listAgents } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic"; // never cache: agents are stored on disk

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ success: false, error: "Unauthorized. Please sign in." }, { status: 401 });
  return NextResponse.json({
    success: true,
    data: await listAgents(session.user.id),
  });
}
