-- 0008: session revocation after a password change.
-- Every password update bumps session_version. JWTs carry the version they
-- were issued with; the jwt callback in lib/auth.ts rejects a token whose
-- version no longer matches, logging out all existing sessions.
alter table public.users
  add column if not exists session_version integer not null default 0;
