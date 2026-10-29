/**
 * Send a Telegram message.
 * - Explicit chatId (a bound user's chat) wins.
 * - Otherwise the global TELEGRAM_CHAT_ID env var (dashboard owner) is used.
 * - Missing keys or dryRun → just logs (never sends).
 */
export async function sendTelegram(
  message: string,
  opts?: { dryRun?: boolean; chatId?: string }
): Promise<{ ok: boolean; dryRun: boolean; chatId?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = opts?.chatId ?? process.env.TELEGRAM_CHAT_ID;
  if (opts?.dryRun || !token || !chatId) {
    console.log(`[telegram:dry-run] ${message}`);
    return { ok: true, dryRun: true, chatId };
  }
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: message }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Telegram send failed: ${res.status} ${text}`);
  }
  return { ok: true, dryRun: false, chatId };
}

/** Interpolate ${s1.price} style refs from step outputs. */
export function renderMessage(
  template: string,
  stepOutputs: Record<string, Record<string, unknown>>
): string {
  return template.replace(/\$\{(s\d+)\.([a-zA-Z0-9_]+)\}/g, (_, sid, field) => {
    const v = stepOutputs[sid]?.[field];
    return v === undefined || v === null ? "" : String(v);
  });
}
