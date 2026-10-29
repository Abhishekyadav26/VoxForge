import { NextResponse } from "next/server";
import { handleTelegramUpdate } from "@/lib/telegram";

export const dynamic = "force-dynamic";

/**
 * Telegram bot webhook. Telegram POSTs every update here once the webhook is
 * set (see scripts/set-telegram-webhook.ts). We only act on `/start <CODE>` —
 * the per-user Telegram binding. Everything else is ignored.
 */
export async function POST(req: Request) {
  try {
    const update = await req.json();
    const note = await handleTelegramUpdate(update);
    console.log(`[telegram:webhook] ${note}`);
    // Always 200 — Telegram retries anything else.
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[telegram:webhook] error:", e?.message ?? e);
    return NextResponse.json({ ok: true });
  }
}

/** GET /api/telegram/webhook → simple liveness probe (useful for curl checks). */
export async function GET() {
  return NextResponse.json({ ok: true, service: "voxforge-telegram-webhook" });
}