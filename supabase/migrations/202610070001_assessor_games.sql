begin;
create table public.assessor_games (
  id text primary key check (id ~ '^[a-z0-9]{10}$'),
  title text not null,
  published_at timestamptz not null,
  game_url text not null,
  launch_url text,
  cover_url text,
  first_seen_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'clear', 'flagged', 'unavailable')),
  reason text,
  reviewed_at timestamptz,
  check (status = 'pending' or reviewed_at is not null)
);
create index assessor_games_pending_idx on public.assessor_games (published_at desc) where status = 'pending';
create index assessor_games_reviewed_idx on public.assessor_games (reviewed_at desc) where status <> 'pending';
alter table public.assessor_games enable row level security;
revoke all on public.assessor_games from public, anon, authenticated;
grant select, insert, update on public.assessor_games to service_role;

create table public.assessor_sync_state (
  id integer primary key check (id = 1),
  newest_id text,
  backfill_cursor text,
  backfill_done boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.assessor_sync_state enable row level security;
revoke all on public.assessor_sync_state from public, anon, authenticated;
grant select, insert, update on public.assessor_sync_state to service_role;
commit;
