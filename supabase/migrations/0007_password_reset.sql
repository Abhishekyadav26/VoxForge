-- Voice-to-Agent Studio: password reset (forgot password)
-- Run this in the Supabase SQL editor after 0006_agent_pause.sql.
-- Stores only a SHA-256 hash of the reset token (never the token itself)
-- plus an expiry. Tokens are single-use and expire after 1 hour.

alter table public.users
  add column if not exists password_reset_token_hash text,
  add column if not exists password_reset_expires_at timestamptz;
