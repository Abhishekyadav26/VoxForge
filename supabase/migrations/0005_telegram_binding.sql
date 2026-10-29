-- 0005: per-user Telegram binding.
-- Each user links their own Telegram chat (via /start <code> to the bot),
-- so alerts from their agents go to their chat instead of the global
-- TELEGRAM_CHAT_ID env var (the dashboard owner's chat).
alter table public.users
  add column telegram_chat_id text,
  add column telegram_code text,
  add column telegram_code_expires_at timestamptz;