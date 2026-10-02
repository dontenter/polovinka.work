begin;
create table if not exists public.life_digest_runs (
  day date primary key,
  owner uuid,
  lease_until timestamptz,
  attempts integer not null default 0,
  parts jsonb,
  next_part integer not null default 0,
  sent_at timestamptz,
  error text,
  updated_at timestamptz not null default now()
);
alter table public.life_digest_runs enable row level security;
revoke all on public.life_digest_runs from public, anon, authenticated;
grant select on public.life_digest_runs to service_role;

create or replace function public.life_claim_run(p_day date, p_owner uuid)
returns setof public.life_digest_runs language plpgsql security definer set search_path = public, pg_temp as $$
declare selected_day date;
begin
  perform pg_advisory_xact_lock(70261002);
  if p_day <> (now() at time zone 'UTC')::date then raise exception 'Invalid day'; end if;
  insert into life_digest_runs(day) values(p_day) on conflict do nothing;
  if exists(select 1 from life_digest_runs where lease_until > now()) then return; end if;
  select day into selected_day from life_digest_runs
    where sent_at is null and attempts < 5 order by day limit 1 for update;
  if selected_day is null then return; end if;
  return query update life_digest_runs set owner=p_owner, lease_until=now()+interval '10 minutes',
    attempts=attempts+1, error=null, updated_at=now() where day=selected_day returning *;
end $$;

create or replace function public.life_checkpoint_run(p_day date, p_owner uuid, p_parts jsonb default null,
  p_next integer default null, p_done boolean default false, p_error text default null)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update life_digest_runs set parts=coalesce(parts,p_parts), next_part=coalesce(p_next,next_part),
    sent_at=case when p_done then now() else sent_at end,
    error=p_error, updated_at=now(),
    lease_until=case when p_done or p_error is not null then null else lease_until end
  where day=p_day and owner=p_owner and lease_until>now();
  return found;
end $$;
revoke all on function public.life_claim_run(date,uuid) from public,anon,authenticated;
revoke all on function public.life_checkpoint_run(date,uuid,jsonb,integer,boolean,text) from public,anon,authenticated;
grant execute on function public.life_claim_run(date,uuid) to service_role;
grant execute on function public.life_checkpoint_run(date,uuid,jsonb,integer,boolean,text) to service_role;
commit;
