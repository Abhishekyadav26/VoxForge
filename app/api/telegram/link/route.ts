import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserById, setTelegramBind } from "@/lib/db";
import { botUsername } from "@/lib/telegram";

export const dynamic = "force-dynamic";

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function randomCode(len = 7): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I confusion
  let s = "";
  const rnd = new Uint8Array(len);
  crypto.getRandomValues(rnd);
  for (let i = 0; i < len; i++) s += chars[rnd[i] % chars.length];
  return s;
}

/**
 * GET /api/telegram/link → per-user Telegram binding info.
 * Returns the current code (generating a fresh one if expired), the bot's
 * username, and whether this user already bound a chat.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id)
      return NextResponse.json({ success: false, error: "Unauthorized. Please sign in." }, { status: 401 });

    const user = await getUserById(session.user.id);
    if (!user) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

    let code = user.telegramCode;
    const expiresAt = user.telegramCodeExpiresAt;
    const stillValid = expiresAt && new Date(expiresAt).getTime() > Date.now();
    if (!code || !stillValid) {
      code = randomCode();
      const exp = new Date(Date.now() + CODE_TTL_MS).toISOString();
      await setTelegramBind(user.id, code, exp);
      user.telegramCode = code;
      user.telegramCodeExpiresAt = exp;
    }

    const bot = await botUsername();
    const link = bot
      ? `https://t.me/${bot.replace(/^@/, "")}?start=${code}`
      : null;

    return NextResponse.json({
      success: true,
      data: {
        code,
        expiresAt: user.telegramCodeExpiresAt,
        bot,
        link,
        chatId: user.telegramChatId ?? null,
        bound: !!user.telegramChatId,
        hasBot: !!bot,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}