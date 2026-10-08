begin;

alter table public.assessor_games
  add column if not exists is_favourite boolean not null default false;

create index if not exists assessor_games_favourites_idx
  on public.assessor_games (reviewed_at desc)
  where is_favourite and status <> 'pending';

commit;
