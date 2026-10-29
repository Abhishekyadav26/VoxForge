-- Voice-to-Agent Studio: multi-user auth (Day 2)
-- Run this in the Supabase SQL editor after 0001_init.sql.
-- Adds per-user scoping so each signed-in user sees only their own agents/runs.
-- The user id is the GitHub user id from the NextAuth JWT (session.user.id).

alter table public.agents add column if not exists user_id text;

alter table public.runs add column if not exists user_id text;

create index if not exists agents_user_id_idx on public.agents (user_id);
create index if not exists runs_user_id_idx on public.runs (user_id);

-- RLS policies already exist for anon; they still apply with user_id filtering
-- done in the app layer. (Fine for single-user-per-project usage.)
