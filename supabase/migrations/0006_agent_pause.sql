-- VoxForge: agent pause/resume.
-- Safe to run on both fresh and existing databases.
alter table public.agents add column if not exists paused boolean not null default false;
