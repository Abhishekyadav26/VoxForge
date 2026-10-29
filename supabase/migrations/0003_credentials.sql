-- Voice-to-Agent Studio: email/password auth (NextAuth Credentials)
-- Run this in the Supabase SQL editor after 0002_auth.sql.
-- Creates the users table used by the Credentials provider.
-- NOTE: with the SECRET key (sb_secret_...) RLS is bypassed. These policies
-- let the PUBLISHABLE key also read/insert users, if you ever switch keys.

create table if not exists public.users (
  id text primary key,
  email text unique not null,
  name text,
  password_hash text not null,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

drop policy if exists "users_select_anon" on public.users;
create policy "users_select_anon" on public.users
  for select to anon
  using (true);

drop policy if exists "users_insert_anon" on public.users;
create policy "users_insert_anon" on public.users
  for insert to anon
  with check (true);