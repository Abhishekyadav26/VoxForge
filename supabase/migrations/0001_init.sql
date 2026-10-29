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

-- Row-level security: the app uses the service_role key server-side, which
-- bypasses RLS, so these policies keep tables locked down for anon/authenticated.
alter table public.agents enable row level security;
alter table public.runs enable row level security;

-- Optional: allow only authenticated users (add your own policies for multi-user).
-- create policy "agents_all_authenticated" on public.agents
--   for all to authenticated using (true) with check (true);
-- create policy "runs_all_authenticated" on public.runs
--   for all to authenticated using (true) with check (true);
