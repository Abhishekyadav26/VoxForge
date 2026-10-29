-- Voice-to-Agent Studio: Google OAuth sign-in option
-- Run this in the Supabase SQL editor after 0003_credentials.sql.
-- Makes password_hash nullable so users who only sign in with Google (no
-- password) can be stored. Email/password users are unaffected.

alter table public.users alter column password_hash drop not null;