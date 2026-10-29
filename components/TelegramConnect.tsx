"use client";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { TelegramIcon } from "@/components/icons";

interface LinkData {
  code: string;
  expiresAt: string;
  bot: string | null;
  link: string | null;
  chatId: string | null;
  bound: boolean;
  hasBot: boolean;
}

/**
 * Per-user Telegram binding card. Shows the current bind code, a deep link
 * (t.me/<bot>?start=<CODE>) the user taps/sends to the bot, and connected
 * state once bound. Alerts from this user's agents then go to their chat
 * instead of the global TELEGRAM_CHAT_ID env var.
 */
export default function TelegramConnect() {
  const [data, setData] = useState<LinkData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/telegram/link", { cache: "no-store" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setData(json.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const mins = data
    ? Math.max(1, Math.round((new Date(data.expiresAt).getTime() - Date.now()) / 60000))
    : 0;

  return (
    <section className="space-y-2 rounded border border-slate-700 p-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <TelegramIcon className="h-5 w-5" /> Telegram alerts
      </h2>

      {data?.bound ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-emerald-800 bg-emerald-950/40 px-3 py-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </span>
          <p className="text-sm text-emerald-200">
            Connected — your agents&apos; alerts land in <strong>your Telegram</strong> (chat{" "}
            <code className="text-emerald-100">{data.chatId}</code>).
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-slate-300">
            Alerts go to your own Telegram, not the demo account. Two taps:
          </p>
          {!data ? (
            <p className="text-sm text-slate-400">{loading ? "Loading…" : error ?? "Something went wrong."}</p>
          ) : data.hasBot ? (
            <ol className="list-inside list-decimal space-y-1 text-sm text-slate-300">
              <li>
                Tap the link to open the bot:{" "}
                <a href={data.link ?? "#"} target="_blank" rel="noreferrer" className="font-medium text-sky-300 underline underline-offset-2">
                  {data.bot} · connect
                </a>
              </li>
              <li>
                Press <strong>Start</strong> (or send{" "}
                <code className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-xs">/start {data.code}</code>)
              </li>
              <li>
                Come back and refresh — you&apos;re connected. The code expires in {mins} min.
              </li>
            </ol>
          ) : (
            <p className="text-sm text-amber-300">
              Telegram bot not configured (TELEGRAM_BOT_TOKEN missing) — alerts will stay dry-run.
            </p>
          )}
        </>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-md border border-slate-600 px-3 py-1.5 text-xs text-slate-200 transition-colors hover:border-slate-400 disabled:opacity-50"
        >
          {loading ? "Checking…" : "⟳ Check connection"}
        </button>
        {data?.bound && (
          <button
            type="button"
            onClick={() => { setData(null); toast("You can re-link anytime."); }}
            className="text-xs text-slate-400 underline underline-offset-2 hover:text-slate-200"
          >
            re-link a different chat
          </button>
        )}
      </div>
    </section>
  );
}