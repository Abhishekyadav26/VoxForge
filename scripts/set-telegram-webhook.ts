/**
 * Point the Telegram bot at this app's webhook so /start <CODE> bindings work.
 *
 *   npx tsx scripts/set-telegram-webhook.ts https://your-domain.com
 *   npx tsx scripts/set-telegram-webhook.ts https://your-domain.com --delete
 *
 * With no args it prints the current webhook status. For local dev, the URL
 * must be publicly reachable (ngrok/cloudflared) — Telegram can't call
 * localhost. Without a webhook, binding still works if you poll instead. Use
 * `--delete` to unset the webhook when switching to a polling bot.
 */
import { z } from "zod";
import { existsSync } from "node:fs";
// Load .env.local without extra deps (Node 20.12+ / 22+).
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("TELEGRAM_BOT_TOKEN not set (source .env.local first)");
  process.exit(1);
}

async function main() {
  const args = process.argv.slice(2);
  const url = args.find((a) => a.startsWith("http"));
  const del = args.includes("--delete");

  if (del) {
    const r = await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`);
    console.log(await r.json());
    return;
  }

  if (!url) {
    const r = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    const j: any = await r.json();
    console.log(j?.result ?? j);
    return;
  }

  const parsed = z.string().url().parse(url);
  const w = new URL(parsed);
  w.pathname = "/api/telegram/webhook";
  const r = await fetch(
    `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(w.toString())}`
  );
  console.log("set →", w.toString());
  console.log(await r.json());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});