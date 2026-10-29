import { bindTelegramChat } from "./db";

/** Get the bot's username (e.g. @VoxForgeBot) via getMe. */
export async function botUsername(): Promise<string | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const json = await res.json();
    return json?.ok && json?.result?.username ? `@${json.result.username}` : null;
  } catch {
    return null;
  }
}

/**
 * Handle an incoming Telegram update (webhook body or polled getUpdates item).
 * - `/start <CODE>`: binds the sender's chat to the user that was shown CODE.
 * Replies to the binding chat so the user gets confirmation.
 * Returns a short human note about what happened (for logs).
 */
export async function handleTelegramUpdate(
  update: Record<string, any>
): Promise<string> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const msg = update?.message ?? update?.edited_message;
  const chatId = msg?.chat?.id as number | undefined;
  const text = typeof msg?.text === "string" ? msg.text : "";
  if (!token || !chatId || !text.startsWith("/start")) {
    return "ignored";
  }
  const code = text.replace(/^\/start\s*/, "").trim();
  if (!code) {
    return "ignored (empty code)";
  }
  // Try to consume the bind code.
  const userId = await bindTelegramChat(code, String(chatId));
  if (!userId) {
    await sendTelegramMessage(
      token,
      chatId,
      "That code is invalid or already used. Open the app and press “Connect Telegram” to get a fresh code."
    );
    return "invalid code";
  }
  await sendTelegramMessage(
    token,
    chatId,
    "✅ Linked! Alerts from your VoxForge agents will arrive here. Go back to the app and hit “Run now” to see one."
  );
  return `bound user ${userId} to chat ${chatId}`;
}

async function sendTelegramMessage(
  token: string,
  chatId: number,
  text: string
): Promise<void> {
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch (e) {
    console.warn("[telegram] reply failed:", (e as Error).message);
  }
}