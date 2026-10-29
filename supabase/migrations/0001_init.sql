-- Voice-to-Agent Studio: Supabase schema
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor) once.
-- Tables mirror the JSON files previously stored in ./data (agents.json, runs.json).

-- Agents: one row per deployed monitoring agent.
create table if not exists public.agents (
  id text primary key,
  name text not null,
  spec jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  last_run timestamptz,
  last_triggered boolean
);

-- Runs: execution history per agent (kept capped in-app to ~200).
create table if not exists public.runs (
  id text primary key,
  agent_id text not null references public.agents(id) on delete cascade,
  executed_at timestamptz not null default now(),
  triggered boolean not null default false,
  trace jsonb not null default '[]'::jsonb,
  messages jsonb not null default '[]'::jsonb
);

create index if not exists runs_agent_id_idx on public.runs (agent_id);
create index if not exists runs_executed_at_idx on public.runs (executed_at desc);

-- Row-level security: this app runs server-side. With a **secret** key
-- (sb_secret_..., legacy service_role) RLS is bypassed entirely. With a
-- **publishable** key (sb_publishable_..., legacy anon) these policies grant
-- full access to the anon role — fine for a single-user app, not for
-- multi-user (add real auth policies then).
alter table public.agents enable row level security;
alter table public.runs enable row level security;

create policy "agents_all_anon" on public.agents
  for all to anon using (true) with check (true);
create policy "runs_all_anon" on public.runs
  for all to anon using (true) with check (true);
