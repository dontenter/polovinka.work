begin;

alter table public.assessor_games
  drop constraint assessor_games_id_check;

alter table public.assessor_games
  add constraint assessor_games_id_check
  check (id ~ '^([a-z0-9]{10}|[a-z0-9]{14})$');

commit;
