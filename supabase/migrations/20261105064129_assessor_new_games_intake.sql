begin;

-- This ledger intentionally survives deletion from the queue/history.
create table public.assessor_intake_games (
  game_id text primary key check (game_id ~ '^([a-z0-9]{10}|[a-z0-9]{14})$'),
  application_id text,
  source_created_at timestamptz,
  first_published_at timestamptz,
  seen boolean not null default false,
  observed_at timestamptz not null default now()
);
-- Complete, immutable set of source applications created before the policy cutoff.
-- It also covers old applications whose FIRST sandbox publication happens later.
create table public.assessor_excluded_applications (
  application_id text primary key
);
create table public.assessor_intake_policy (
  id integer primary key check (id=1),
  created_not_before timestamptz not null,
  source_snapshot_at timestamptz,
  excluded_application_count integer,
  initialized_at timestamptz
);
insert into public.assessor_intake_policy(id,created_not_before)
values(1,'2026-11-01T00:00:00+08:00');

alter table public.assessor_intake_games enable row level security;
alter table public.assessor_excluded_applications enable row level security;
alter table public.assessor_intake_policy enable row level security;
revoke all on public.assessor_intake_games,public.assessor_excluded_applications,public.assessor_intake_policy from public,anon,authenticated;
grant select,insert,update on public.assessor_intake_games to service_role;
grant select on public.assessor_excluded_applications,public.assessor_intake_policy to service_role;

insert into public.assessor_intake_games(game_id,seen)
select id,true from public.assessor_games;

create function public.assessor_remember_game() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  insert into public.assessor_intake_games(game_id,seen) values(new.id,true)
  on conflict(game_id) do update set seen=true;
  return new;
end $$;
revoke all on function public.assessor_remember_game() from public,anon,authenticated;
grant execute on function public.assessor_remember_game() to service_role;
create trigger assessor_remember_game after insert on public.assessor_games
for each row execute function public.assessor_remember_game();

-- Claim each unseen site and enqueue it in the SAME transaction. Retries and
-- concurrent callers cannot requeue a known game or overwrite a saved review.
create function public.assessor_ingest_new_games(p_games jsonb) returns integer
language plpgsql security invoker set search_path='' as $$
declare
  item jsonb;
  game_id_value text;
  application_id_value text;
  claimed_id text;
  cutoff timestamptz;
  inserted integer;
  total integer:=0;
begin
  select created_not_before into cutoff from public.assessor_intake_policy
  where id=1 and initialized_at is not null;
  if cutoff is null then raise exception 'Assessor intake baseline is not initialized'; end if;
  if jsonb_typeof(p_games) <> 'array' or jsonb_array_length(p_games)>100 then
    raise exception 'Invalid intake batch';
  end if;
  for item in select value from jsonb_array_elements(p_games) loop
    game_id_value:=item->>'id';
    application_id_value:=item->>'application_id';
    if game_id_value is null or game_id_value !~ '^([a-z0-9]{10}|[a-z0-9]{14})$'
      or application_id_value is null or application_id_value !~ '^[A-Za-z0-9_-]{1,128}$'
      or coalesce(item->>'title','')='' or (item->>'published_at')::timestamptz is null then
      raise exception 'Invalid intake game';
    end if;
    claimed_id:=null;
    insert into public.assessor_intake_games as existing(game_id,application_id,seen)
    values(game_id_value,application_id_value,true)
    on conflict(game_id) do update set seen=true,
      application_id=coalesce(existing.application_id,excluded.application_id)
    where not existing.seen
    returning game_id into claimed_id;
    if claimed_id is null then continue; end if;
    if exists(select 1 from public.assessor_excluded_applications where application_id=application_id_value)
      or exists(select 1 from public.assessor_intake_games where game_id=game_id_value and source_created_at<cutoff) then
      continue;
    end if;
    insert into public.assessor_games(id,title,published_at,game_url,launch_url,cover_url)
    values(game_id_value,item->>'title',(item->>'published_at')::timestamptz,
      'https://playgama.ai/play/'||game_id_value,null,item->>'cover_url')
    on conflict(id) do nothing;
    get diagnostics inserted=row_count;
    total:=total+inserted;
  end loop;
  return total;
end $$;
revoke all on function public.assessor_ingest_new_games(jsonb) from public,anon,authenticated;
grant execute on function public.assessor_ingest_new_games(jsonb) to service_role;

commit;
