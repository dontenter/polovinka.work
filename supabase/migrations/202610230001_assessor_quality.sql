begin;

alter table public.assessor_games
  add column if not exists is_ai_slop boolean not null default false;

alter table public.assessor_games
  add constraint assessor_games_quality_exclusive
  check (not (is_favourite and is_ai_slop));

create index assessor_games_ai_slop_idx
  on public.assessor_games (reviewed_at desc)
  where is_ai_slop and status <> 'pending';

commit;
