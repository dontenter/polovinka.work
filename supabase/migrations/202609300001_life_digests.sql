-- Run once in the SQL Editor of the new Supabase project.
begin;
create table public.life_digests (
  id text primary key check (id ~ '^[0-9]{8}T[0-9]{6}Z$'),
  period_from timestamptz not null,
  period_to timestamptz not null check (period_to > period_from),
  model text not null check (length(model) between 1 and 80),
  message_count integer not null check (message_count >= 0),
  markdown text not null check (length(markdown) between 1 and 100000),
  created_at timestamptz not null default now()
);
alter table public.life_digests enable row level security;
revoke all on public.life_digests from public, anon, authenticated;
grant select, insert on public.life_digests to service_role;
-- No browser policies: only server requests with a secret key may access this archive.
commit;
