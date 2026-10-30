/**
 * Minimal scheduler: calls /api/cron/run-due every minute so interval
 * agents alert on their own. Run alongside the app:
 *   npx tsx scripts/scheduler.ts
 * Env: APP_URL (default http://localhost:3000), CRON_SECRET (required),
 *      SCHEDULER_INTERVAL_MS (default 60000).
 */
// Load .env.local without extra deps (Node 20.12+ / 22+).
import { existsSync } from "node:fs";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
const SECRET = process.env.CRON_SECRET;
const EVERY = Number(process.env.SCHEDULER_INTERVAL_MS ?? 60_000);

if (!SECRET) {
  console.error("CRON_SECRET is not set (.env.local). Refusing to start.");
  process.exit(1);
}

async function tick() {
  const started = new Date().toISOString();
  try {
    const res = await fetch(`${APP_URL}/api/cron/run-due`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SECRET}` },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) {
      console.error(`[${started}] tick failed ${res.status}: ${json.error ?? "unknown"}`);
      return;
    }
    if (json.ran > 0) {
      for (const o of json.data as any[]) {
        const tag = o.ok ? (o.triggered ? "FIRED" : "ok") : "ERROR";
        console.log(`[${started}] ${tag} ${o.name}${o.error ? ` — ${o.error}` : ""}`);
      }
    }
  } catch (e: any) {
    console.error(`[${started}] tick error: ${e?.message ?? e}`);
  }
}

console.log(`Scheduler → ${APP_URL} every ${EVERY / 1000}s`);
void tick();
setInterval(() => void tick(), EVERY);
