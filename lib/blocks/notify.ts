/** Send a Telegram message. In dry-run / missing keys, logs instead. */
export async function sendTelegram(
  message: string,
  opts?: { dryRun?: boolean }
): Promise<{ ok: boolean; dryRun: boolean }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (opts?.dryRun || !token || !chatId) {
    console.log(`[telegram:dry-run] ${message}`);
    return { ok: true, dryRun: true };
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
  return { ok: true, dryRun: false };
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
