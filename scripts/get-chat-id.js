#!/usr/bin/env node
/**
 * Get your Telegram chat ID in one step.
 *
 * How to use:
 *   1. Message your bot on Telegram first (open the bot link, hit Start).
 *   2. Make sure TELEGRAM_BOT_TOKEN is set in .env.local (or pass it here).
 *   3. Run: node scripts/get-chat-id.js
 *
 * It calls Bot API getUpdates and prints every chat ID found.
 */
const fs = require("fs");
const path = require("path");

function loadToken() {
  // 1) CLI arg: node get-chat-id.js TOKEN
  if (process.argv[2]) return process.argv[2];
  // 2) Env var
  if (process.env.TELEGRAM_BOT_TOKEN) return process.env.TELEGRAM_BOT_TOKEN;
  // 3) .env.local
  const envPath = path.join(process.cwd(), ".env.local");
  try {
    const raw = fs.readFileSync(envPath, "utf8");
    const m = raw.match(/^TELEGRAM_BOT_TOKEN\s*=\s*"?([^"\r\n]+)"?$/m);
    if (m && m[1]) return m[1];
  } catch {
    /* no .env.local */
  }
  return null;
}

async function main() {
  const token = loadToken();
  if (!token) {
    console.error(
      "❌ No bot token found.\n" +
        "   · Set TELEGRAM_BOT_TOKEN in .env.local, or\n" +
        "   · run: node scripts/get-chat-id.js <TOKEN>"
    );
    process.exit(1);
  }

  console.log("🔎 Fetching updates from Telegram… (did you message the bot with /start?)");
  const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
  const json = await res.json();

  if (!json.ok) {
    console.error("❌ Telegram API error:", json.description ?? JSON.stringify(json));
    process.exit(1);
  }
  if (!json.result || json.result.length === 0) {
    console.error(
      "⚠️  No messages yet. Open the bot in Telegram, press Start / send /start,\n" +
        "   then run this script again."
    );
    process.exit(1);
  }

  const chats = new Map();
  for (const u of json.result) {
    const chat = u?.message?.chat ?? u?.edited_message?.chat ?? u?.channel_post?.chat;
    if (chat && !chats.has(chat.id)) {
      chats.set(chat.id, `${chat.type} (${chat.first_name ?? chat.username ?? "?"})`);
    }
  }
  console.log("✅ Chat IDs found:");
  for (const [id, label] of chats) console.log(`   ${id}  ← ${label}`);
  console.log("\nCopy the number into .env.local as: TELEGRAM_CHAT_ID=<number>");
}

main().catch((e) => {
  console.error("❌ Failed:", e.message);
  process.exit(1);
});